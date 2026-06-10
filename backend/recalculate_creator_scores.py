from app import create_app, db
from app.services.creator_score_service import CreatorScoreService


def main():
    app = create_app()
    with app.app_context():
        count = CreatorScoreService.recalculate_all()
        db.session.commit()
        print(f'Recalculated creator scores and rankings for {count} creators.')


if __name__ == '__main__':
    main()
