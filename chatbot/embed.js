import dotenv from 'dotenv';
dotenv.config();

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as OpenAIModule from "@langchain/openai";
const OpenAIEmbeddings = OpenAIModule.OpenAIEmbeddings;
import { get_db_connection } from '../server/models/rdbms.js';

const embeddings = new OpenAIEmbeddings({ modelName: "text-embedding-ada-002" });
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

async function embedTitles() {
  const db = get_db_connection();
  await db.connect();

  const [rows] = await db.send_sql(`
    SELECT n.primaryName, p.category, p.job, t.primaryTitle, t.startYear
    FROM principals p
    JOIN names n ON p.nconst = n.nconst
    JOIN titles t ON p.tconst = t.tconst
    WHERE p.category IN ('actor','actress','director')
    LIMIT 5000;
  `);

  const textChunks = rows.map(r =>
    r.category === 'director'
      ? `${r.primaryName} directed the movie ${r.primaryTitle} (${r.startYear})`
      : `${r.primaryName} played the role of ${r.job || 'unknown role'} in ${r.primaryTitle} (${r.startYear})`
  );

  const docs = textChunks.map(t => new Document({ pageContent: t }));
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 30 });
  const splitDocs = await splitter.splitDocuments(docs);

  await Chroma.fromDocuments(splitDocs, embeddings, {
    collectionName: "actor_movie_roles",
    url: CHROMA_URL,
  });

  console.log("Finished embedding `actor_movie_roles`.");
}

async function embedReviews() {
    const db = get_db_connection();
    await db.connect();
  
    const [rows] = await db.send_sql(`SELECT review FROM reviews LIMIT 50000;`);
    const docs = rows.map(r => new Document({ pageContent: r.review }));
  
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const splitDocs = await splitter.splitDocuments(docs);
  
    const batchSize = 1000;
    const embeddings = new OpenAIEmbeddings({ modelName: "text-embedding-ada-002" });
    const vectorStore = await Chroma.fromDocuments(splitDocs.slice(0, batchSize), embeddings, {
      collectionName: "movie_reviews",
      url: process.env.CHROMA_URL || "http://localhost:8000",
    });
  
    for (let i = batchSize; i < splitDocs.length; i += batchSize) {
      const batch = splitDocs.slice(i, i + batchSize);
      await vectorStore.addDocuments(batch);
      console.log(`Added batch ${i} to ${i + batchSize}`);
    }
  
    console.log("Finished embedding `movie_reviews`.");
  }

  (async function main() {
    try {
      console.log("Starting embedding...");
      await embedTitles();
      await embedReviews();
      console.log("All embeddings complete.");
      process.exit(0);
    } catch (err) {
      console.error("Embedding failed:", err);
      process.exit(1);
    }
  })();
  