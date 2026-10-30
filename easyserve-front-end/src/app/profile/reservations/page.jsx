import { redirect } from "next/navigation";

// Bookings live on one page for guests and signed-in customers alike.
export default function ProfileReservationsPage() {
  redirect("/reservations");
}
