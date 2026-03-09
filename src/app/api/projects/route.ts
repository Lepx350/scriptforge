import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, inputScript, inputMethod, originalFilename } = body;

    if (!title || !inputScript) {
      return NextResponse.json({ error: "Title and script are required" }, { status: 400 });
    }

    const wordCount = inputScript.split(/\s+/).filter(Boolean).length;
    const estimatedDurationMinutes = Math.ceil(wordCount / 150);

    const project = await prisma.project.create({
      data: {
        title,
        inputScript,
        inputMethod: inputMethod || "paste",
        originalFilename: originalFilename || null,
        estimatedDurationMinutes,
        status: "draft",
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
