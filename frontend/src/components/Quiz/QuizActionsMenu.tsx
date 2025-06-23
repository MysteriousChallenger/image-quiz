import { IconButton } from "@chakra-ui/react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu";

import type { ImageQuizRead } from "@/client";
import DeleteQuiz from "../Quiz/DeleteQuiz";

interface QuizActionsMenuProps {
  quiz: ImageQuizRead;
}

export const QuizActionsMenu = ({ quiz }: QuizActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <DeleteQuiz id={quiz.id} />
      </MenuContent>
    </MenuRoot>
  );
};
