import argparse
import os
import sys
from datetime import datetime, timedelta

BACKEND_ROOT = os.getenv('BANTUBUZZ_BACKEND_ROOT', '/var/www/bantubuzz/backend')
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

ENV_FILE = os.getenv('BANTUBUZZ_ENV_FILE', '/etc/bantubuzz/platform.env')


def load_env_file(path):
    if not os.path.exists(path):
        return

    with open(path, 'r', encoding='utf-8') as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()

            if not key:
                continue

            if (
                len(value) >= 2
                and value[0] == value[-1]
                and value[0] in ("'", '"')
            ):
                value = value[1:-1]

            os.environ.setdefault(key, value)


load_env_file(ENV_FILE)
os.environ.setdefault('FLASK_ENV', 'production')

from app import create_app, db
from app.models import OTP, User
from sqlalchemy import text


def parse_args():
    parser = argparse.ArgumentParser(
        description='Preview or delete unverified creator/brand users.'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Actually delete matching users. Omit for dry run.',
    )
    parser.add_argument(
        '--older-than-hours',
        type=int,
        default=0,
        help='Only target users created at least this many hours ago. Default: 0, all unverified users.',
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=20,
        help='Number of matching users to print in the preview.',
    )
    return parser.parse_args()


def build_query(args):
    query = User.query.filter(
        User.is_verified.is_(False),
        User.is_admin.is_(False),
        User.user_type.in_(('creator', 'brand')),
    )

    if args.older_than_hours and args.older_than_hours > 0:
        cutoff = datetime.utcnow() - timedelta(hours=args.older_than_hours)
        query = query.filter(User.created_at <= cutoff)

    return query.order_by(User.created_at.asc(), User.id.asc())


def print_preview(query, sample_size):
    total = query.count()
    creators = query.filter(User.user_type == 'creator').count()
    brands = query.filter(User.user_type == 'brand').count()

    print('mode=dry_run')
    print(f'total_unverified_users={total}')
    print(f'unverified_creators={creators}')
    print(f'unverified_brands={brands}')
    print('sample:')

    for user in query.limit(sample_size).all():
        created = user.created_at.isoformat() if user.created_at else 'unknown'
        print(f'  id={user.id} type={user.user_type} email={user.email} created_at={created}')

    return total


def delete_users(query):
    users = query.all()
    total = len(users)
    user_ids = [user.id for user in users]

    if not user_ids:
        print('mode=execute')
        print('deleted_users=0')
        return

    print('mode=execute')
    print(f'target_users={total}')

    cleanup_user_references(user_ids)
    deleted = User.query.filter(User.id.in_(user_ids)).delete(synchronize_session=False)

    db.session.commit()
    print(f'deleted_users={deleted}')
    print('status=success')


def quote_ident(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def cleanup_user_references(user_ids):
    rows = db.session.execute(
        text(
            """
            SELECT
                tc.table_schema,
                tc.table_name,
                kcu.column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_schema = 'public'
                AND ccu.table_name = 'users'
                AND ccu.column_name = 'id'
                AND tc.table_schema = 'public'
                AND tc.table_name <> 'users'
            ORDER BY tc.table_name, kcu.column_name
            """
        )
    ).mappings().all()

    # OTPs are commonly present and deleting them first keeps the preview cleanup obvious.
    OTP.query.filter(OTP.user_id.in_(user_ids)).delete(synchronize_session=False)

    for row in rows:
        table = row['table_name']
        column = row['column_name']
        if table == 'otps' and column == 'user_id':
            continue

        statement = text(
            f'DELETE FROM {quote_ident(table)} '
            f'WHERE {quote_ident(column)} = ANY(:user_ids)'
        )
        result = db.session.execute(statement, {'user_ids': user_ids})
        if result.rowcount:
            print(f'  deleted_references table={table} column={column} rows={result.rowcount}')


def main():
    args = parse_args()
    app = create_app()
    with app.app_context():
        query = build_query(args)
        if args.execute:
            delete_users(query)
        else:
            print_preview(query, args.sample)


if __name__ == '__main__':
    main()
