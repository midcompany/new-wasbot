import {
  Table,
  Column,
  Model,
  ForeignKey,
  PrimaryKey,
} from "sequelize-typescript";
import User from "./User";
import Services from "./Service";

@Table({
  tableName: "UserServices",
  timestamps: false,
})
class UserServices extends Model<UserServices> {
  @PrimaryKey
  @ForeignKey(() => User)
  @Column
  userId: number;

  @PrimaryKey
  @ForeignKey(() => Services)
  @Column
  serviceId: number;
}

export default UserServices;
