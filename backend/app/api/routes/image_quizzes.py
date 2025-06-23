import json
import uuid
from pathlib import Path
from typing import Annotated, Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Field, SQLModel, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import (
    ImageQuiz,
    ImageQuizBase,
    ImageQuizQuestion,
    ImageQuizQuestionBase,
    Message,
)
from app.util.cache import Cache

IMAGE_QUIZ_DIR = "image_quizzes"


class ImageQuizQuestionRead(ImageQuizQuestionBase):
    id: uuid.UUID


class ImageQuizQuestionCreate(ImageQuizQuestionBase):
    pass


class ImageQuizQuestionUpdate(ImageQuizQuestionBase):
    id: uuid.UUID | None = Field(default=None)


class ImageQuizCreate(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    questions: list[ImageQuizQuestionCreate]


class ImageQuizRead(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    questions: list[ImageQuizQuestionRead]
    id: uuid.UUID


class ImageQuizUpdate(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    questions: list[ImageQuizQuestionUpdate]


class ImageQuizReadList(SQLModel):
    data: list[ImageQuizRead]
    count: int


create_quiz_metadata_cache = Cache[tuple[uuid.UUID, uuid.UUID], ImageQuizCreate](
    max_size=256
)
router = APIRouter(prefix="/image_quizzes", tags=["image_quizzes"])


@router.get("/", response_model=ImageQuizReadList)
def read_quizzes(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> ImageQuizReadList:

    if current_user.is_superuser:
        count = session.exec(select(func.count()).select_from(ImageQuiz)).one()
        quizzes = session.exec(select(ImageQuiz).offset(skip).limit(limit)).all()
    else:
        count = session.exec(
            select(func.count())
            .select_from(ImageQuiz)
            .where(ImageQuiz.owner_id == current_user.id)
        ).one()
        quizzes = session.exec(
            select(ImageQuiz)
            .where(ImageQuiz.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
        ).all()

    return ImageQuizReadList(
        data=[ImageQuizRead.model_validate(i) for i in quizzes], count=count
    )


@router.get("/{id}", response_model=ImageQuizRead)
def read_quiz(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> ImageQuizRead:
    """
    Get quiz by ID.
    """
    quiz = session.get(ImageQuiz, id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not current_user.is_superuser and (quiz.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return quiz


@router.get(
    "/{id}/image",
)
def read_quiz_image(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> FileResponse:
    """
    Get quiz image by ID.
    """
    quiz = session.get(ImageQuiz, id)
    print(quiz.owner_id, current_user.id)
    print(quiz.owner_id, current_user.id)
    print(quiz.owner_id, current_user.id)
    print(quiz.owner_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not current_user.is_superuser and (quiz.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return FileResponse(quiz.image)


@router.post("/create_metadata")
def create_quiz_metadata(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    quiz_create: ImageQuizCreate,
) -> uuid.UUID:
    """
    Create new quiz metadata. Use returned token to create quiz.
    """
    token_id = uuid.uuid4()
    create_quiz_metadata_cache.set((current_user.id, token_id), quiz_create)
    return token_id


@router.post("/", response_model=ImageQuizRead)
def create_quiz(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    token: Annotated[uuid.UUID, Form()],
    file: UploadFile,
) -> ImageQuizRead:
    """
    Create new quiz using metadata matching the token returned from /create_metadata.
    """

    cached_quiz_create = create_quiz_metadata_cache.get((current_user.id, token))
    if not cached_quiz_create:
        raise HTTPException(status_code=404, detail="invalid or expired token")

    quiz_uuid = uuid.uuid4()

    (Path(settings.UPLOADS_DIR) / IMAGE_QUIZ_DIR).mkdir(parents=True, exist_ok=True)
    quiz_image_path = (
        Path(settings.UPLOADS_DIR) / IMAGE_QUIZ_DIR / f"{quiz_uuid}_{file.filename}"
    )
    quiz_image_path.write_bytes(file.file.read())

    quiz = ImageQuiz(
        **cached_quiz_create.model_dump(exclude_unset=True, exclude={"questions"}),
        id=quiz_uuid,
        image=quiz_image_path,
        owner_id=current_user.id,
        questions=[],
    )

    for new_question in cached_quiz_create.questions:
        session.add(
            ImageQuizQuestion.model_validate(new_question, update={"owner_id": quiz.id})
        )

    session.add(quiz)

    session.commit()
    session.refresh(quiz)
    return quiz


@router.put("/{id}", response_model=ImageQuizRead)
def update_quiz(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    quiz_update: ImageQuizUpdate,
) -> ImageQuizRead:
    """
    Update an quiz.
    """
    quiz = session.get(ImageQuiz, id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not current_user.is_superuser and (quiz.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")

    new_questions = [i for i in quiz_update.questions if i.id is None]
    updated_questions = {i.id: i for i in quiz_update.questions if i.id is not None}
    old_questions = {q.id: q for q in quiz.questions}

    if (
        len(nonexistent_questions := updated_questions.keys() - old_questions.keys())
        > 0
    ):
        raise HTTPException(
            status_code=404,
            detail=f"Questions {[str(i) for i in nonexistent_questions]} not found",
        )

    for new_question in new_questions:
        session.add(
            ImageQuizQuestion.model_validate(
                new_question.model_dump(exclude={"id"}),
                update={"owner_id": quiz.id},
            )
        )

    for updated_question in old_questions.keys() & updated_questions.keys():
        question = old_questions[updated_question]
        question.sqlmodel_update(
            updated_questions[updated_question].model_dump(exclude_unset=True)
        )
        session.add(question)

    for deleted_question in old_questions.keys() - updated_questions.keys():
        session.delete(old_questions[deleted_question])

    update_dict = quiz_update.model_dump(exclude_unset=True)
    quiz.sqlmodel_update(update_dict)
    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz


@router.delete("/{id}")
def delete_quiz(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an quiz.
    """
    quiz = session.get(ImageQuiz, id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not current_user.is_superuser and (quiz.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(quiz)
    session.commit()
    return Message(message="Quiz deleted successfully")
