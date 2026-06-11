import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";

// ── Search query validation ────────────────────────────────────
// These are the URL query parameters: /api/v1/hotels/search?city=Chennai&checkIn=...
const searchQuerySchema = z.object({
  city: z.string().min(1),
  checkIn: z.string().datetime({ message: "checkIn must be ISO 8601 (e.g. 2024-06-15T14:00:00Z)" }),
  checkOut: z.string().datetime({ message: "checkOut must be ISO 8601" }),
  guests: z.coerce.number().int().min(1).max(10).default(1),
  // Optional filters
  minPrice: z.coerce.number().int().min(0).optional(), // paise
  maxPrice: z.coerce.number().int().min(0).optional(), // paise
  tier: z.enum(["BUDGET", "STANDARD", "PREMIUM", "LUXURY"]).optional(),
  amenities: z.string().optional(), // comma-separated: "wifi,ac,parking"
});

type SearchQuery = z.infer<typeof searchQuerySchema>;

export async function searchRoutes(app: FastifyInstance) {
  // ── GET /search ─────────────────────────────────────────────
  // Returns hotels available for the requested time slot in a city.
  //
  // Availability logic:
  //   A room type has N total rooms.
  //   Count how many are booked (CONFIRMED) overlapping the requested slot.
  //   If bookedCount < totalRooms → at least one room is available.
  app.get<{ Querystring: SearchQuery }>(
    "/search",
    async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
      const result = searchQuerySchema.safeParse(request.query);
      if (!result.success) {
        return reply.status(400).send({
          error: "Invalid search parameters",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { city, checkIn, checkOut, guests, minPrice, maxPrice, tier, amenities } = result.data;

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (checkOutDate <= checkInDate) {
        return reply.status(400).send({ error: "checkOut must be after checkIn" });
      }

      const minHours = 1;
      const durationHours =
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
      if (durationHours < minHours) {
        return reply.status(400).send({ error: "Minimum booking duration is 1 hour" });
      }

      // Parse amenities filter
      const amenityFilter = amenities
        ? amenities.split(",").map((a) => a.trim()).filter(Boolean)
        : undefined;

      // Fetch hotels matching city/tier/amenity filters
      const hotels = await prisma.hotel.findMany({
        where: {
          city: { contains: city, mode: "insensitive" },
          isVerified: true,
          isActive: true,
          ...(tier && { tier }),
          ...(amenityFilter && {
            amenities: { hasEvery: amenityFilter },
          }),
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          roomTypes: {
            where: {
              isActive: true,
              maxGuests: { gte: guests },
              ...(minPrice !== undefined && { pricePerHour: { gte: minPrice } }),
              ...(maxPrice !== undefined && { pricePerHour: { lte: maxPrice } }),
            },
            include: {
              // Count overlapping confirmed bookings per room type
              bookingSlots: {
                where: {
                  status: "CONFIRMED",
                  // Overlap condition: slot starts before our checkOut AND ends after our checkIn
                  checkIn: { lt: checkOutDate },
                  checkOut: { gt: checkInDate },
                },
                select: { id: true }, // we only need the count
              },
            },
          },
        },
      });

      // Filter to hotels that have at least one available room type
      const available = hotels
        .map((hotel) => {
          const availableRoomTypes = hotel.roomTypes.filter(
            (rt) => rt.bookingSlots.length < rt.totalRooms
          );
          if (availableRoomTypes.length === 0) return null;

          // Cheapest available room price for display
          const lowestPrice = Math.min(...availableRoomTypes.map((rt) => rt.pricePerHour));

          return {
            id: hotel.id,
            name: hotel.name,
            address: hotel.address,
            city: hotel.city,
            tier: hotel.tier,
            amenities: hotel.amenities,
            primaryImage: hotel.images[0]?.url ?? null,
            lowestPricePerHour: lowestPrice, // paise
            availableRoomTypes: availableRoomTypes.map((rt) => ({
              id: rt.id,
              name: rt.name,
              pricePerHour: rt.pricePerHour,
              maxGuests: rt.maxGuests,
              availableCount: rt.totalRooms - rt.bookingSlots.length,
            })),
          };
        })
        .filter(Boolean); // remove null (fully booked hotels)

      return reply.send({ results: available, total: available.length });
    }
  );
}
