import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";

// ── Availability check schema ─────────────────────────────────
const availabilitySchema = z.object({
  roomTypeId: z.string().min(1),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
});

export async function hotelRoutes(app: FastifyInstance) {
  // ── GET /:hotelId ────────────────────────────────────────────
  // Full hotel profile — shown on the hotel detail page.
  app.get<{ Params: { hotelId: string } }>(
    "/:hotelId",
    async (request: FastifyRequest<{ Params: { hotelId: string } }>, reply: FastifyReply) => {
      const { hotelId } = request.params;

      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId, isVerified: true, isActive: true },
        include: {
          images: { orderBy: { isPrimary: "desc" } },
          roomTypes: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              pricePerHour: true,
              maxGuests: true,
              amenities: true,
              totalRooms: true,
            },
          },
        },
      });

      if (!hotel) {
        return reply.status(404).send({ error: "Hotel not found" });
      }

      return reply.send({ hotel });
    }
  );

  // ── POST /availability ───────────────────────────────────────
  // Check if a specific room type is available for a time slot.
  // Called when the user selects a slot on the booking page.
  app.post(
    "/availability",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = availabilitySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { roomTypeId, checkIn, checkOut } = result.data;
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId, isActive: true },
        include: {
          bookingSlots: {
            where: {
              status: "CONFIRMED",
              checkIn: { lt: checkOutDate },
              checkOut: { gt: checkInDate },
            },
            select: { id: true },
          },
        },
      });

      if (!roomType) {
        return reply.status(404).send({ error: "Room type not found" });
      }

      const bookedCount = roomType.bookingSlots.length;
      const availableCount = roomType.totalRooms - bookedCount;

      return reply.send({
        roomTypeId,
        available: availableCount > 0,
        availableCount,
        pricePerHour: roomType.pricePerHour, // paise
      });
    }
  );
}
