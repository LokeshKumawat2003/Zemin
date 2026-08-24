import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  fonts: {
    heading: "'DM Sans', sans-serif",
    body: "'DM Sans', sans-serif",
  },
  colors: {
    ink: "#17212B",
    canvas: "#F6F8FA",
    brand: {
      50: "#EAF7F4",
      100: "#C8EBE4",
      500: "#0F8B7B",
      600: "#08766A",
      700: "#075E55",
    },
    coral: "#E86A4A",
  },
  styles: {
    global: {
      "html, body, #root": { minHeight: "100%" },
      body: { bg: "canvas", color: "ink" },
      "main form": { width: "100%", minWidth: 0 },
      "main form > *": { minWidth: 0, maxWidth: "100%", flex: "1 1 180px" },
      "main input[type=datetime-local]": { width: "100%", minWidth: 0, boxSizing: "border-box", height: "40px", border: "1px solid #CBD5E0", borderRadius: "6px", padding: "0 10px" },
    },
  },
  components: {
    Button: { baseStyle: { borderRadius: "8px", fontWeight: 700 } },
    Card: { baseStyle: { borderRadius: "12px" } },
  },
});
