import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";

// ── Validation schemas ─────────────────────────────────────────

const registerHotelSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, "Must be a 6-digit pincode"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  tier: z.enum(["BUDGET", "STANDARD", "PREMIUM", "LUXURY"]).default("STANDARD"),
  amenities: z.array(z.string()).default([]),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, "Valid Indian mobile number required"),
  email: z.string().email(),
});

const addRoomTypeSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  pricePerHour: z.number().int().min(100), // minimum ₹1/hr (100 paise)
  totalRooms: z.number().int().min(1).max(500),
  maxGuests: z.number().int().min(1).max(10).default(2),
  amenities: z.array(z.string()).default([]),
});

// ── Auth middleware ────────────────────────────────────────────
// Reusable preHandler — verifies JWT and checks the user has HOTEL_PARTNER role.
async function requirePartner(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const user = request.user as { userId: string; role: string };
  if (user.role !== "HOTEL_PARTNER" && user.role !== "ADMIN") {
    return reply.status(403).send({ error: "Hotel partner account required" });
  }
}

export async function partnerRoutes(app: FastifyInstance) {
  // ── POST /hotels ─────────────────────────────────────────────
  // Register a new hotel. The hotel starts as unverified (isVerified: false).
  // An admin must verify it before it appears in search results.
  app.post(
    "/hotels",
    { preHandler: requirePartner },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = registerHotelSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { userId } = request.user as { userId: string };

      // Check partner doesn't already have a hotel with this name (prevent duplicates)
      const existing = await prisma.hotel.findFirst({
        where: { ownerId: userId, name: result.data.name },
      });
      if (existing) {
        return reply.status(409).send({
          error: "You already have a hotel registered with this name",
        });
      }

      const hotel = await prisma.hotel.create({
        data: {
          ...result.data,
          ownerId: userId,
          isVerified: false, // requires admin approval
        },
      });

      return reply.status(201).send({
        hotel,
        message: "Hotel registered. It will appear in search after admin verification.",
      });
    }
  );

  // ── GET /hotels ──────────────────────────────────────────────
  // List all hotels owned by the logged-in partner.
  app.get(
    "/hotels",
    { preHandler: requirePartner },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };

      const hotels = await prisma.hotel.findMany({
        where: { ownerId: userId },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          roomTypes: {
            where: { isActive: true },
            select: { id: true, name: true, pricePerHour: true, totalRooms: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ hotels });
    }
  );

  // ── POST /hotels/:hotelId/rooms ───────────────────────────────
  // Add a room type to a hotel.
  app.post<{ Params: { hotelId: string } }>(
    "/hotels/:hotelId/rooms",
    { preHandler: requirePartner },
    async (
      request: FastifyRequest<{ Params: { hotelId: string } }>,
      reply: FastifyReply
    ) => {
      const result = addRoomTypeSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { userId } = request.user as { userId: string };
      const { hotelId } = request.params;

      // Make sure this hotel belongs to the requesting partner
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel || hotel.ownerId !== userId) {
        return reply.status(404).send({ error: "Hotel not found" });
      }

      const roomType = await prisma.roomType.create({
        data: { ...result.data, hotelId },
      });

      return reply.status(201).send({ roomType });
    }
  );

  // ── PUT /hotels/:hotelId/rooms/:roomTypeId ────────────────────
  // Update room type pricing or availability.
  app.put<{ Params: { hotelId: string; roomTypeId: string } }>(
    "/hotels/:hotelId/rooms/:roomTypeId",
    { preHandler: requirePartner },
    async (
      request: FastifyRequest<{ Params: { hotelId: string; roomTypeId: string } }>,
      reply: FastifyReply
    ) => {
      // Partial update — only provided fields are changed
      const result = addRoomTypeSchema.partial().safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { userId } = request.user as { userId: string };
      const { hotelId, roomTypeId } = request.params;

      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel || hotel.ownerId !== userId) {
        return reply.status(404).send({ error: "Hotel not found" });
      }

      const roomType = await prisma.roomType.update({
        where: { id: roomTypeId, hotelId },
        data: result.data,
      });

      return reply.send({ roomType });
    }
  );
}
