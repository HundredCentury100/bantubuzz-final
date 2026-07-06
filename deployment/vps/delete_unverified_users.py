import argparse
from datetime import datetime, timedelta

from app import create_app, db
from app.models import OTP, User


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

    OTP.query.filter(OTP.user_id.in_(user_ids)).delete(synchronize_session=False)

    deleted = 0
    failed = []
    for user in users:
        try:
            db.session.delete(user)
            db.session.flush()
            deleted += 1
        except Exception as exc:
            db.session.rollback()
            failed.append((user.id, user.email, str(exc)))

    if failed:
        db.session.rollback()
        print(f'deleted_users=0')
        print('status=failed')
        print('Deletion was rolled back because at least one user could not be deleted safely.')
        for user_id, email, error in failed[:20]:
            print(f'  failed id={user_id} email={email} error={error}')
        raise SystemExit(1)

    db.session.commit()
    print(f'deleted_users={deleted}')
    print('status=success')


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
