import { NextResponse } from "next/server";
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// Silence unused in some tooling
void NextResponse;
