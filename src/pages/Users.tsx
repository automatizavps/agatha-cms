import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const Users = () => {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User data table will be displayed here.</p>
          {/* Placeholder for user table */}
          <div className="h-64 w-full rounded-lg border border-dashed flex items-center justify-center text-muted-foreground mt-4">
            Table of Users
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Users;