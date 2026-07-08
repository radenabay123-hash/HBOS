import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET — list all chat rooms the current user is a member of, with last message preview & unread count
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const memberships = await db.chatMember.findMany({
      where: { userId: user.id },
      include: {
        room: {
          include: {
            members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true } } } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { room: { updatedAt: "desc" } },
    });

    // For each room, compute unread count = messages after lastReadAt
    const rooms = await Promise.all(
      memberships.map(async (m) => {
        const unread = await db.chatMessage.count({
          where: {
            roomId: m.roomId,
            createdAt: { gt: m.lastReadAt },
            userId: { not: user.id }, // don't count own messages
            deletedAt: null,
          },
        });
        const lastMessage = m.room.messages[0] || null;
        // For DIRECT rooms, find the "other" user
        const otherUser =
          m.room.type === "DIRECT"
            ? m.room.members.find((mem) => mem.userId !== user.id)?.user
            : null;
        return {
          id: m.room.id,
          type: m.room.type,
          name: m.room.type === "GROUP" ? m.room.name : otherUser?.name,
          avatar: m.room.type === "GROUP" ? m.room.avatar : otherUser?.avatar,
          description: m.room.description,
          members: m.room.members.map((mem) => ({
            id: mem.id,
            userId: mem.userId,
            role: mem.role,
            name: mem.user.name,
            userRole: mem.user.role,
            avatar: mem.user.avatar,
            isActive: mem.user.isActive,
            muted: mem.muted,
          })),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                type: lastMessage.type,
                fileName: lastMessage.fileName,
                senderName: lastMessage.user.name,
                senderId: lastMessage.userId,
                createdAt: lastMessage.createdAt,
                deletedAt: lastMessage.deletedAt,
              }
            : null,
          unread,
          lastReadAt: m.lastReadAt,
          muted: m.muted,
          updatedAt: m.room.updatedAt,
          createdAt: m.room.createdAt,
          isMember: true,
        };
      })
    );

    return ok({ rooms });
  });
}

// POST — create a new chat room (DIRECT or GROUP)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { type, name, description, memberIds, avatar } = body;

    if (!type || !["DIRECT", "GROUP"].includes(type)) {
      return err("type must be DIRECT or GROUP", 400);
    }

    const allMemberIds = Array.from(new Set([user.id, ...(memberIds || []).filter((id: string) => id !== user.id)]));

    if (type === "DIRECT") {
      if (allMemberIds.length !== 2) return err("DIRECT room requires exactly 2 members", 400);
      // Find existing DIRECT room with these two members
      const existing = await db.chatRoom.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId: allMemberIds[0] } } },
            { members: { some: { userId: allMemberIds[1] } } },
          ],
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true } } } },
        },
      });
      if (existing) {
        return ok({ room: { ...existing, alreadyExisted: true } });
      }
    } else {
      // GROUP
      if (!name || !name.trim()) return err("Group name required", 400);
      if (allMemberIds.length < 2) return err("At least 2 members required", 400);
    }

    const room = await db.chatRoom.create({
      data: {
        type,
        name: type === "GROUP" ? String(name).trim() : null,
        description: description || null,
        avatar: avatar || null,
        createdBy: user.id,
        members: {
          create: allMemberIds.map((uid: string) => ({
            userId: uid,
            role: uid === user.id ? "ADMIN" : "MEMBER",
          })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true } } } },
      },
    });

    // Create a SYSTEM welcome message for groups
    if (type === "GROUP") {
      await db.chatMessage.create({
        data: {
          roomId: room.id,
          userId: user.id,
          content: `${user.name} membuat grup "${room.name}"`,
          type: "SYSTEM",
        },
      });
    }

    return ok({ room });
  });
}
