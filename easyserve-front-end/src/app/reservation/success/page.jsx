import { redirect } from "next/navigation";

// The booking popup now shows the confirmation itself.
export default function ReservationSuccessPage() {
  redirect("/reservations");
}
