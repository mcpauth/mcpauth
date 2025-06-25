import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100); // Add a max limit
    const cursor = searchParams.get("cursor");

    const logs = await db.mcpRequestLog.findMany({
      where: {
        userId: session.user.id,
      },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        timestamp: "desc",
      },
    });

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextItem = logs.pop(); // Remove the extra item
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({
      items: logs,
      nextCursor,
    });
  } catch (error) {
    // Handle Prisma's specific error for invalid cursor
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    console.error("Failed to fetch MCP request logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
