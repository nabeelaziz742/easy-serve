import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import ProfileOverview from "./ProfileOverview";
import ProfileOrders from "./ProfileOrders";
import ProfileFiles from "./ProfileFiles";
import ProfileSecurity from "./ProfileSecurity";

export default function ProfileTabs({ user }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {/*<TabsTrigger value="orders">Orders</TabsTrigger>*/}
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>

        {user.user_type === "restaurant_owner" && (
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview">
        <ProfileOverview user={user} />
      </TabsContent>

      <TabsContent value="orders">
        {/*<ProfileOrders />*/}
      </TabsContent>

      <TabsContent value="files">
        <ProfileFiles />
      </TabsContent>

      <TabsContent value="security">
        <ProfileSecurity />
      </TabsContent>
    </Tabs>
  );
}
