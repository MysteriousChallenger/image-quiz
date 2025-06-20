import {
  createFileRoute,
} from "@tanstack/react-router"
import { Flex } from "@chakra-ui/react"
import Navbar from "@/components/Common/Navbar"
import CreateQuiz from "@/components/quiz/CreateQuiz"

export const Route = createFileRoute("/")({
  component: Index
})

function Index() {
  return (
    <Flex direction="column" h="100vh">
      <Navbar />
      <Flex flex="1" overflow="hidden">
        <Flex flex="1" direction="column" p={4} overflowY="auto">
          <CreateQuiz/>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Index