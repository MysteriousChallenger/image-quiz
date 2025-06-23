import AddItem from "@/components/Items/AddItem";
import { Container, Heading } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import PlayQuiz from "@/components/Quiz/PlayQuiz";

export const Route = createFileRoute("/_user/quizzes/$quizId")({
  component: Quizzes,
});

function Quizzes() {
  const params = Route.useParams();
  return (
    <Container maxW="full">
      <PlayQuiz quizId={params.quizId} />
    </Container>
  );
}
