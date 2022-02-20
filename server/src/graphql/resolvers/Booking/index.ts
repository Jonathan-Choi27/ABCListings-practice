import { Request } from "express";
import { ObjectId } from "mongodb";
import { IResolvers } from "@graphql-tools/utils";

import { Stripe } from "../../../lib/api";
import { authorize } from "../../../lib/utils";
import { CreateBookingArgs, EmptyObject } from "./types";
import { Booking, Database, Listing, BookingsIndex } from "../../../lib/types";

const MILLI_SECONDS_PER_DAY = 86400000;

const resolveBookingsIndex = (
  bookingsIndex: BookingsIndex,
  checkInDate: string,
  checkOutDate: string
): BookingsIndex => {
  let dateCursor = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const newBookingsIndex: BookingsIndex = { ...bookingsIndex };

  while (dateCursor <= checkOut) {
    const y = dateCursor.getUTCFullYear();
    const m = dateCursor.getUTCMonth();
    const d = dateCursor.getUTCDate();

    if (!newBookingsIndex[y]) newBookingsIndex[y] = {};

    if (!newBookingsIndex[y][m]) newBookingsIndex[y][m] = {};

    if (!newBookingsIndex[y][m][d]) {
      newBookingsIndex[y][m][d] = true;
    } else {
      throw new Error(
        "Selected dates can't overlap dates that have already been booked."
      );
    }

    dateCursor = new Date(dateCursor.getTime() + MILLI_SECONDS_PER_DAY); // Day after
  }

  return newBookingsIndex;
};

export const bookingResolvers: IResolvers = {
  Mutation: {
    createBooking: async (
      _root: undefined,
      { input }: CreateBookingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Booking> => {
      try {
        const { id, source, checkIn, checkOut } = input;

        const viewer = await authorize(db, req);
        if (!viewer) throw new Error("Viewer cannot be found.");

        const listing = await db.listings.findOne({ _id: new ObjectId(id) });
        if (!listing) throw new Error("Listing cannot be found.");

        if (listing.host === viewer._id)
          throw new Error("Viewer can't book own listing.");

        const today = new Date();
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (
          checkInDate.getTime() >
          today.getTime() + 90 * MILLI_SECONDS_PER_DAY
        )
          throw new Error(
            "Check in date can't be more than 90 days from today."
          );

        if (
          checkOutDate.getTime() >
          today.getTime() + 90 * MILLI_SECONDS_PER_DAY
        )
          throw new Error(
            "Check out date can't be more than 90 days from today."
          );

        if (checkOutDate < checkInDate)
          throw new Error("Check out date can't be before check in date.");

        const bookingsIndex = resolveBookingsIndex(
          listing.bookingsIndex,
          checkIn,
          checkOut
        );

        const totalPrice =
          listing.price *
          ((checkOutDate.getTime() - checkInDate.getTime()) /
            MILLI_SECONDS_PER_DAY +
            1);

        const host = await db.users.findOne({ _id: listing.host });
        if (!host || !host.walletId)
          throw new Error("Host can't be found or is not connected to Stripe.");

        await Stripe.charge(totalPrice, source, host.walletId);

        const insertBooking = await db.bookings.insertOne({
          _id: new ObjectId(),
          listing: listing._id,
          tenant: viewer._id,
          checkIn,
          checkOut,
        });

        const insertedBooking = await db.bookings.findOne({
          _id: insertBooking.insertedId,
        });

        await db.users.updateOne(
          {
            _id: host._id,
          },
          {
            $inc: { income: totalPrice },
          }
        );

        await db.users.updateOne(
          {
            _id: viewer._id,
          },
          {
            $push: { bookings: insertedBooking?._id },
          }
        );

        await db.listings.updateOne(
          {
            _id: listing._id,
          },
          {
            $set: { bookingsIndex },
            $push: { bookings: insertedBooking?._id },
          }
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return insertedBooking!;
      } catch (error) {
        throw new Error(`Failed to create a booking: ${error}`);
      }
    },
  },
  Booking: {
    id: (booking: Booking): string => {
      return booking._id.toString();
    },
    listing: (
      booking: Booking,
      _args: EmptyObject,
      { db }: { db: Database }
    ): Promise<Listing | null> => {
      return db.listings.findOne({ _id: booking.listing });
    },
    tenant: (
      booking: Booking,
      _args: EmptyObject,
      { db }: { db: Database }
    ) => {
      return db.users.findOne({ _id: booking.tenant });
    },
  },
};
