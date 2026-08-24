import { ChakraProvider } from "@chakra-ui/react";
import Router from "routes";
import { theme } from "./theme";
export const App = () => (
  <ChakraProvider theme={theme}>
    <Router />
  </ChakraProvider>
);