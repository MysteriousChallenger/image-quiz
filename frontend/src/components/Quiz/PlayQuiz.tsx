import { ImageQuizzesService } from "@/client";
import { Box, Button, Circle, Flex, Heading, Image } from "@chakra-ui/react";
import { OpenAPI } from "@/client";
import { useQuery } from "@tanstack/react-query";
import { useWindowSize } from "./CreateQuiz";
import { useEffect, useRef, useState } from "react";

interface QuestionState {
  position: { x: number; y: number };
  label: string;
}

function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const Timer = ({
  active,
  timerShouldBeCleared,
}: {
  active: boolean;
  timerShouldBeCleared: boolean;
}) => {
  const CLOCK_INTERVAL = 10; // ms
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    if (active) {
      const clock = setInterval(() => {
        setTime(time + CLOCK_INTERVAL);
      }, CLOCK_INTERVAL);
      return () => {
        clearInterval(clock);
      };
    }
  }, [time, active]);

  useEffect(() => {
    if (active) {
      setTime(0);
    }
  }, [active]);

  useEffect(() => {
    if (timerShouldBeCleared) {
      setTime(0);
    }
  }, [timerShouldBeCleared]);

  let time2 = time / 1000;
  const seconds = String((time2 % 60).toFixed(2)).padStart(5, "0");
  time2 = Math.floor(time2 / 60);
  const minutes = String(time2).padStart(2, "0");

  return (
    <Box>
      {minutes}:{seconds}
    </Box>
  );
};

const QuestionSegment = ({ label }: { label: string }) => {
  return (
    <Box p={1} fontSize={24} flexGrow={1} textAlign="center">
      {label}
    </Box>
  );
};

const ScoreSegment = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => {
  return (
    <Box p={1} color={color}>
      <Box fontSize={10}>{label}</Box>
      <Box fontSize={24}>{value}</Box>
    </Box>
  );
};

const QuizTopBar = ({
  hasCompleted,
  hasStarted,
  currentQuestion,
  questionCount,
  correctCount,
  incorrectCount,
  onRestart,
}: {
  hasCompleted: boolean;
  hasStarted: boolean;
  currentQuestion: string | null;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  onRestart: () => void;
}) => {
  const remaining = questionCount - correctCount;

  const timerIsActive = hasStarted == true && hasCompleted == false;
  const timerShouldBeCleared = hasStarted == false;
  const questionLabel = hasCompleted == false ? currentQuestion ?? "" : "Done!";

  return (
    <Flex display="flex" justify="space-between" gap={4} w="100%" top={0}>
      <Flex backgroundColor="gray.100" p={2} borderRadius="md">
        <ScoreSegment label="Remaining" value={remaining} color="black" />
        <ScoreSegment label="Correct" value={correctCount} color="green" />
        <ScoreSegment label="Wrong" value={incorrectCount} color="red" />
      </Flex>
      <Flex
        backgroundColor="gray.100"
        alignItems="center"
        p={2}
        borderRadius="md"
        flexGrow="1"
      >
        <QuestionSegment label={questionLabel} />
      </Flex>
      <Flex
        backgroundColor="gray.100"
        alignItems="center"
        p={2}
        fontSize={24}
        borderRadius="md"
      >
        <Timer
          active={timerIsActive}
          timerShouldBeCleared={timerShouldBeCleared}
        />
      </Flex>
      <Flex fontSize={24}>
        <Button height="100%" size="md" onClick={onRestart}>
          Restart
        </Button>
      </Flex>
    </Flex>
  );
};

const QuizQuestion = ({
  question,
  anchor,
  onClick,
}: {
  question: QuestionState;
  anchor: HTMLElement | null;
  onClick: (question: QuestionState) => void;
}) => {
  if (!anchor) {
    return null;
  }

  const [_height, _width] = useWindowSize();
  const { position, label } = question;
  const rect = anchor.getBoundingClientRect();
  const x = position.x * rect.width;
  const y = position.y * rect.height;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClick(question);
    console.log(`Clicked on question ${label} at ${e.clientX}, ${e.clientY}`);
  };

  return (
    <Circle
      position="absolute"
      left={`${x}px`}
      top={`${y}px`}
      p={1.5}
      backgroundColor="lightblue"
      borderWidth="1px"
      borderColor="black"
      m={-1.5}
      onClick={handleClick}
    ></Circle>
  );
};

function readQuizQuery({ id }: { id: string }) {
  return {
    queryFn: () => ImageQuizzesService.readQuiz({ id }),
    queryKey: ["quiz", id],
  };
}

function readQuizImageQuery({ id }: { id: string }) {
  const url = `${OpenAPI.BASE}/api/v1/image_quizzes/${id}/image`;
  return {
    queryFn: () => {
      const token = localStorage.getItem("access_token") || "";
      return fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.blob(); // Get the image as a Blob
        })
        .then((blob) => {
          return URL.createObjectURL(blob);
        });
    },
    queryKey: ["quiz", id, "image"],
  };
}

const PlayQuiz = ({ quizId: id }: { quizId: string }) => {
  const boxRef = useRef<HTMLElement>(null);
  const { data: quizData, isSuccess: getQuizSuccess } = useQuery({
    ...readQuizQuery({ id }),
    placeholderData: (prevData) => prevData,
  });
  const { data } = useQuery({
    ...readQuizImageQuery({ id }),
    placeholderData: (prevData) => prevData,
  });

  const [drawQuizQuestions, setDrawQuizQuestions] = useState(false);

  const quiz = quizData ?? null;

  const questionCount = quiz?.questions.length ?? 0;
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const hasStarted = correctCount != 0 || incorrectCount != 0;
  const hasCompleted = correctCount == questionCount;

  const [questions, setQuestions] = useState<string[] | null>(null);
  useEffect(() => {
    if (getQuizSuccess) {
      if (quiz == null) {
        throw new Error(
          "should be unreachable: quiz is null after successful query?"
        );
      }
      setQuestions(
        shuffleArray(quiz.questions.map((question) => question.label))
      );
    }
  }, [getQuizSuccess]);
  const currentQuestion =
    (correctCount < questionCount ? questions?.[correctCount] : null) ?? null;

  function handleClick(question: QuestionState) {
    if (hasCompleted == true) {
      return;
    }
    if (question.label == currentQuestion) {
      setCorrectCount(correctCount + 1);
    } else {
      setIncorrectCount(incorrectCount + 1);
    }
  }

  function handleRestart() {
    if (getQuizSuccess) {
      if (quiz == null) {
        throw new Error(
          "should be unreachable: quiz is null after successful query?"
        );
      }
      setQuestions(
        shuffleArray(quiz.questions.map((question) => question.label))
      );
      setCorrectCount(0);
      setIncorrectCount(0);
    }
  }

  function handleImageLoad() {
    setDrawQuizQuestions(true);
  }

  return (
    <>
      <Heading size="lg" textAlign="center" p={4} fontSize={34}>
        {quiz?.title ?? ""}
      </Heading>
      <Box
        width="60%"
        margin="auto"
        minWidth="content-box"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
      >
        <QuizTopBar
          questionCount={questionCount}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          hasCompleted={hasCompleted}
          hasStarted={hasStarted}
          currentQuestion={currentQuestion}
          onRestart={handleRestart}
        />
        <Box padding={2}></Box>
        <Box p={4} backgroundColor="gray.100">
          <Box ref={boxRef} width={"content-box"} position="relative">
            {drawQuizQuestions
              ? quiz?.questions.map((question, index) => (
                  <QuizQuestion
                    key={index}
                    question={{
                      position: { x: question.x, y: question.y },
                      label: question.label,
                    }}
                    anchor={boxRef.current!}
                    onClick={handleClick}
                  />
                ))
              : null}
            <Image
              src={data}
              alt="Placeholder Image"
              onLoad={handleImageLoad}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default PlayQuiz;
