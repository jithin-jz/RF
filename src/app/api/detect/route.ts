import { NextRequest, NextResponse } from "next/server";
import { detectRepository } from "@/lib/detector";
import { DetectRequestSchema, DetectionResult } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = DetectRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let { url } = parsed.data;

    // Normalize URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    // Remove trailing slash for consistency
    url = url.replace(/\/+$/, "");

    // Run detection
    const { repo, methods, techStack } = await detectRepository(url);

    const result: DetectionResult = {
      url,
      isOpenSource: repo !== null,
      repo,
      methods,
      techStack,
      scannedAt: new Date().toISOString(),
      error: null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      {
        url: "",
        isOpenSource: false,
        repo: null,
        methods: [],
        techStack: [],
        scannedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      } satisfies DetectionResult,
      { status: 500 }
    );
  }
}
