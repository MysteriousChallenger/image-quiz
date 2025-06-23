import uuid
from pathlib import Path

from sqlalchemy import Connection, Dialect, TypeDecorator, event, types
from sqlalchemy.orm import Mapper
from sqlmodel import Column, Field, Relationship, SQLModel

import app.models.models as models


class PathType(TypeDecorator[Path]):
    impl = types.String
    cache_ok = True

    def process_bind_param(self, value: Path | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value: str | None, dialect: Dialect) -> Path | None:
        if value is None:
            return None
        return Path(value)


class ImageQuizBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    image: Path = Field(max_length=255, sa_column=Column(PathType, nullable=False))


class ImageQuiz(ImageQuizBase, table=True):

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE", index=True
    )
    owner: models.User | None = Relationship(back_populates="quizzes")

    questions: list["ImageQuizQuestion"] = Relationship(
        back_populates="owner", cascade_delete=True
    )


class ImageQuizQuestionBase(SQLModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    label: str = Field(min_length=1, max_length=255)


class ImageQuizQuestion(ImageQuizQuestionBase, table=True):

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="imagequiz.id", nullable=False, ondelete="CASCADE", index=True
    )
    owner: ImageQuiz = Relationship(back_populates="questions")


@event.listens_for(ImageQuiz, "after_delete")
def receive_after_delete(
    mapper: Mapper[ImageQuiz], connection: Connection, target: ImageQuiz
):
    "listen for the 'after_delete' event"
    target.image.unlink(missing_ok=True)
