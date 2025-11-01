import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";

const router = express.Router();

export default router;
