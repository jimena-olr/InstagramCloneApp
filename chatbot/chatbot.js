// chatbot/chatbot.js
import * as dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  retrieveRelevantDocs,
  ensureRetrieversReady
} from "../installite-backend/utils/vector.js";

const template = `
Answer the question based on the following context:

Context:
{context}

Question:
{question}

Answer:
`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["context", "question"]
});

const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.7
});

export async function callChatbot(query) {
  await ensureRetrieversReady();

  const docs = await retrieveRelevantDocs(query);
  const context = docs.map(d => d.pageContent).join("\n\n");

  const filledPrompt = await prompt.format({ context, question: query });
  const response = await model.call([{ role: "user", content: filledPrompt }]);

  return response.text;
}

/* Optional: local testing only
async function testChatbot() {
  const answer = await callChatbot("Who directed Cinderella?");
  console.log("Answer:", answer);
}

testChatbot();*/