import {
  Box,
  Button,
  ButtonGroup,
  Circle,
  CloseButton,
  Image,
  Container,
  FileUpload,
  Flex,
  Float,
  For,
  Icon,
  Input,
  Stack,
  Steps,
  useFileUploadContext,
} from "@chakra-ui/react";
import { LuFileImage, LuFileUp, LuTrash, LuUpload, LuX } from "react-icons/lu";
import { InputGroup } from "../ui/input-group";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);

  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }

    window.addEventListener("resize", updateSize);
    updateSize(); // Call once initially to get the current size

    return () => window.removeEventListener("resize", updateSize); // Cleanup
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return size;
}

const UploadImagePreview = () => {
  const fileUpload = useFileUploadContext();
  const files = fileUpload.acceptedFiles;
  if (files.length === 0) return null;
  return (
    <FileUpload.ItemGroup>
      {files.map((file) => (
        <FileUpload.Item
          position="relative"
          w="auto"
          boxSize="100%"
          p="2"
          file={file}
          key={file.name}
          justifyContent="center"
        >
          <FileUpload.ItemPreviewImage boxSize="100%" />
          <Float placement="top-end">
            <FileUpload.ItemDeleteTrigger boxSize="4">
              <Circle size="5" bg="red" color="white">
                <LuX />
              </Circle>
            </FileUpload.ItemDeleteTrigger>
          </Float>
        </FileUpload.Item>
      ))}
    </FileUpload.ItemGroup>
  );
};

const UploadImageButton = ({
  handleUpload,
}: {
  handleUpload: (files: File) => void;
}) => {
  const fileUpload = useFileUploadContext();
  const files = fileUpload.acceptedFiles;

  function onClickUpload() {
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }

  return (
    <Button
      onClick={onClickUpload}
      disabled={files.length === 0}
      width="fit-content"
    >
      <LuFileUp />
      Upload Image
    </Button>
  );
};

const UploadQuizImage = ({
  handleUpload,
}: {
  handleUpload: (files: File) => void;
}) => {
  return (
    <>
      <FileUpload.Root alignItems="stretch" maxFiles={1} accept="image/*">
        <FileUpload.HiddenInput />
        <FileUpload.Dropzone>
          <Icon size="md" color="fg.muted">
            <LuUpload />
          </Icon>
          <FileUpload.DropzoneContent>
            <Box>Click to upload or Drag and drop files here</Box>
            {/* <Box color="fg.muted">.png, .jpg up to 5MB</Box> */}
          </FileUpload.DropzoneContent>
        </FileUpload.Dropzone>

        <UploadImagePreview />
        <UploadImageButton handleUpload={handleUpload} />
      </FileUpload.Root>
    </>
  );
};

interface QuestionState {
  position: { x: number; y: number };
  label: string;
  isDialogOpen: boolean;
}

const QuizQuestionDialog = ({
  question,
  isOpen,
  setQuestionLabel,
  deleteQuestion,
}: {
  question: QuestionState;
  isOpen: boolean;
  setQuestionLabel: (label: string) => void;
  deleteQuestion: () => void;
}) => {
  if (isOpen === false) {
    return null;
  }

  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      gap={2}
      p={2}
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        placeholder="Type Question Here"
        width="15em"
        onChange={(e) => {
          setQuestionLabel(e.target.value);
        }}
        value={question.label}
      />
      <Button
        onClick={() => {
          deleteQuestion();
        }}
      >
        <LuTrash />
      </Button>
    </Box>
  );
};

const QuizQuestion = ({
  question,
  anchor,
  setIsDialogOpen,
  setQuestionLabel,
  deleteQuestion,
}: {
  question: QuestionState;
  anchor: HTMLElement;
  setIsDialogOpen: (isDialogOpen: boolean) => void;
  setQuestionLabel: (label: string) => void;
  deleteQuestion: () => void;
}) => {
  const [height, width] = useWindowSize();

  const { position, label } = question;
  const rect = anchor.getBoundingClientRect();
  const x = rect.left + position.x * rect.width;
  const y = rect.top + position.y * rect.height;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDialogOpen(!question.isDialogOpen);
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
    >
      <Float placement="top-center">
        <Box position="relative" top={-10} backgroundColor="gray.100" borderRadius="md" opacity="0.8">
          <QuizQuestionDialog
            question={question}
            isOpen={question.isDialogOpen}
            setQuestionLabel={setQuestionLabel}
            deleteQuestion={deleteQuestion}
          />
        </Box>
      </Float>
    </Circle>
  );
};

const CreateQuizQuestions = ({ quizImage }: { quizImage: File | null }) => {
  const boxRef = useRef<HTMLElement>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);

  function handleCreateQuestion(e: React.MouseEvent<HTMLDivElement>) {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();

    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    setQuestions([
      ...questions.map((q) => {
        return { ...q, isDialogOpen: false };
      }),
      {
        position: { x: relativeX, y: relativeY },
        label: `Question ${questions.length + 1}`,
        isDialogOpen: true,
      },
    ]);

    console.log(`event ${e.screenX} ${e.screenY}`);
  }

  function handleDialogOpenChange(isDialogOpen: boolean, index: number) {
    setQuestions(
      questions.map((q, i) =>
        i === index ? { ...q, isDialogOpen } : { ...q, isDialogOpen: false }
      )
    );
  }

  function handleQuestionLabelChange(label: string, index: number) {
    setQuestions(questions.map((q, i) => (i === index ? { ...q, label } : q)));
  }

  function handleDeleteQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  if (!quizImage) {
    return <Box>Please upload an image first.</Box>;
  }

  return (
    <>
      <Box
        width="60%"
        margin="auto"
        minWidth="content-box"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
      >
        <Box onClick={handleCreateQuestion} ref={boxRef}>
          {questions.map((question, index) => (
            <QuizQuestion
              key={index}
              question={question}
              anchor={boxRef.current!}
              setIsDialogOpen={(isDialogOpen) => {
                handleDialogOpenChange(isDialogOpen, index);
              }}
              setQuestionLabel={(label) => {
                handleQuestionLabelChange(label, index);
              }}
              deleteQuestion={() => handleDeleteQuestion(index)}
            />
          ))}
          <Image src={URL.createObjectURL(quizImage)} alt="Placeholder Image" />
        </Box>
      </Box>
    </>
  );
};

const CreateQuiz = () => {
  const [step, setStep] = useState(0);
  const [quizImage, setQuizImage] = useState<File | null>(null);

  function handleUpload(image: File) {
    setQuizImage(image);
    setStep(step + 1);
  }

  const steps = [
    {
      title: "Select an Image",
      content: UploadQuizImage({ handleUpload: handleUpload }),
    },
    {
      title: "Step 2",
      content: CreateQuizQuestions({ quizImage: quizImage! }),
    },
  ];

  const submitButton = (
    <Button>
      submit
    </Button>
  )

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Steps.Root step={step} size="md" count={steps.length}>
        <Steps.List>
          {steps.map((step, index) => (
            <Steps.Item
              gap="0.75rem"
              key={index}
              index={index}
              title={step.title}
            >
              <Steps.Indicator />
              <Box>
                <Steps.Title>{step.title}</Steps.Title>
              </Box>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        {steps.map((step, index) => (
          <Steps.Content key={index} index={index}>
            {step.content}
          </Steps.Content>
        ))}
        <Steps.CompletedContent>All steps are complete!</Steps.CompletedContent>
      </Steps.Root>
      { step == steps.length - 1 ? submitButton : null }
    </Box>
  );
};

export default CreateQuiz;
