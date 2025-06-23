import {
  Box,
  Button,
  Container,
  EmptyState,
  Flex,
  Heading,
  Table,
  VStack,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FiSearch } from "react-icons/fi";
import { z } from "zod";

import { ImageQuizzesService } from "@/client";
import PendingItems from "@/components/Pending/PendingItems";
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx";
import { QuizActionsMenu } from "@/components/Quiz/QuizActionsMenu";
import { FaPlus } from "react-icons/fa";
import { useCallback } from "react";

const quizSearchSchema = z.object({
  page: z.number().catch(1),
});

const PER_PAGE = 5;

function getQuizzesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      ImageQuizzesService.readQuizzes({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["quizzes", { page }],
  };
}

export const Route = createFileRoute("/_user/quizzes/")({
  component: Quizzes,
  validateSearch: (search) => quizSearchSchema.parse(search),
});

function QuizTable() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page } = Route.useSearch();

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getQuizzesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  });

  const setPage = (page: number) => {
    navigate({
      search: (prev: { [key: string]: string }) => ({
        ...prev,
        page: String(page),
      }),
    });
  };

  const handlePlay = (quizId: string) => {
    navigate({
      to: `${quizId}`,
      search: {},
    });
  };

  const quizzes = data?.data.slice(0, PER_PAGE) ?? [];
  const count = data?.count ?? 0;

  if (isLoading) {
    return <PendingItems />;
  }

  if (quizzes.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>You don't have any quizzes yet</EmptyState.Title>
            <EmptyState.Description>
              Add a new quiz to get started
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="sm">ID</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Title</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Description</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {quizzes?.map((quiz) => (
            <Table.Row key={quiz.id} opacity={isPlaceholderData ? 0.5 : 1}>
              <Table.Cell
                truncate
                maxW="sm"
                onClick={() => {
                  handlePlay(quiz.id);
                }}
              >
                {quiz.id}
              </Table.Cell>
              <Table.Cell
                truncate
                maxW="sm"
                onClick={() => {
                  handlePlay(quiz.id);
                }}
              >
                {quiz.title}
              </Table.Cell>
              <Table.Cell
                color={!quiz.description ? "gray" : "inherit"}
                truncate
                maxW="30%"
                onClick={() => {
                  handlePlay(quiz.id);
                }}
              >
                {quiz.description || "N/A"}
              </Table.Cell>
              <Table.Cell>
                <QuizActionsMenu quiz={quiz} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  );
}

function Quizzes() {
  const navigate = useNavigate();
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Quiz Management
      </Heading>
      <Button
        value="add-item"
        my={4}
        onClick={() => {
          navigate({ to: "/create" });
        }}
      >
        <FaPlus fontSize="16px" />
        Add Quiz
      </Button>
      <QuizTable />
    </Container>
  );
}
