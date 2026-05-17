import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ProfileController } from "./profile.controller";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "AUTH_SERVICE",
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST || "localhost",
          port: Number(process.env.AUTH_SERVICE_PORT) || 3002,
        },
      },
    ]),
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
