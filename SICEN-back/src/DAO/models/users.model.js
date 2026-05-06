import { isValidPassword } from "../../utils/Bcrypt.js";
import { UserMongoose } from "./mongoose/users.mongoose.js";

class UsersModel {
  async getAll() {
    const users = await UserMongoose.find(
      {},
      {
        _id: true,
        avatar: true,
        first_name: true,
        last_name: true,
        rank: true,
        email: true,
        role: true,
        fines: true,
      }
    );
    return users;
  }

  async findById(id) {
    const userFound = await UserMongoose.findById(id);
    return userFound;
  }

  async findUser(email, password) {
    const user = await UserMongoose.findOne(
      { email: email },
      {
        _id: true,
        avatar: true,
        first_name: true,
        last_name: true,
        rank: true,
        email: true,
        password: true,
        role: true,
        fines: true,
      }
    );
    if (user && isValidPassword(password, user.password)) {
      return user;
    } else {
      return false;
    }
  }

  async findByEmail(email) {
    const user = await UserMongoose.findOne(
      { email: email },
      {
        _id: true,
        avatar: true,
        first_name: true,
        last_name: true,
        rank: true,
        email: true,
        password: true,
        role: true,
        fines: true,
      }
    );
    return user;
  }

  async create({ avatar, first_name, last_name, rank, email, password, role, fines }) {
    const userCreated = await UserMongoose.create({
      avatar,
      first_name,
      last_name,
      rank,
      email,
      password,
      role,
      fines,
    });
    return userCreated;
  }

  async updateOne({
    _id,
    avatar,
    first_name,
    last_name,
    rank,
    email,
    password,
    role,
    fines,
    last_modified_by
  }) {
    const userUpdated = await UserMongoose.updateOne(
      {
        _id: _id,
      },
      {
        avatar,
        first_name,
        last_name,
        rank,
        email,
        password,
        role,
        fines,
        last_modified_by
      }
    );
    return userUpdated;
  }

  async deleteOne(_id) {
    const result = await UserMongoose.deleteOne({ _id: _id });
    return result;
  }

  async updatePassword({email, password}) {
    const userUpdated = await UserMongoose.updateOne(
      { email: email },
      {
        password: password,
      }
    );
    return userUpdated
  }

  async updateFines({_id, fines}){
    const userUpdated = await UserMongoose.updateOne(
      {
        _id: _id,
      },
      {
        fines
      }
    );
    return userUpdated;
  }
}

export const usersModel = new UsersModel();
