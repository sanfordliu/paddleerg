/**
 * AWS Lambda entrypoint (API Gateway HTTP API / REST).
 * Deploy later; local development uses src/index.ts.
 */
import dotenv from 'dotenv';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from './app';

dotenv.config();

const app = createApp();

export const handler = serverlessExpress({ app });
