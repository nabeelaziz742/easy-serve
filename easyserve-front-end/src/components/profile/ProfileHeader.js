import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileHeader({ user }) {
  return (
    <Card className="flex flex-col sm:flex-row items-center gap-6 p-6 mb-6">
      <ProfileAvatar user={user} />

      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-2xl font-bold">
          {user.profile.first_name} {user.profile.last_name}
        </h2>

        <p className="text-gray-500">{user.email}</p>

        <div className="mt-2">
          <Badge className="capitalize">
            {user.user_type.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
