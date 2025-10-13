export const availableTools = [
  {
    name: "click",
    description: "Clicks on an element",
    args: [
      {
        name: "elementId",
        type: "number",
      },
    ],
  },
  {
    name: "setValue",
    description: "Focuses on and sets the value of an input element",
    args: [
      {
        name: "elementId",
        type: "number",
      },
      {
        name: "value",
        type: "string",
      },
    ],
  },
  {
    name: "navigate",
    description: "Navigates to a specified URL",
    args: [
      {
        name: "url",
        type: "string",
      },
    ],
  },
  {
    name: "waiting",
    description:
      "Waits for the specified number of seconds, minimum seconds is 5 seconds",
    args: [
      {
        name: "seconds",
        type: "number",
      },
    ],
  },
  {
    name: "finish",
    description: "Indicates the task is finished",
    args: [
      {
        name: "message",
        type: "string",
      },
    ],
  },
] as const;
