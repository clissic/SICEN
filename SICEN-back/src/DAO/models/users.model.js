import { buildDefaultUserStates } from "../../constants/userStates.js";
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
        unit: true,
        email: true,
        role: true,
        fines: true,
        states: true,
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
        unit: true,
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
    const normalized = String(email ?? "").trim();
    if (!normalized) return null;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await UserMongoose.findOne(
      { email: { $regex: new RegExp(`^${escaped}$`, "i") } },
      {
        _id: true,
        avatar: true,
        first_name: true,
        last_name: true,
        rank: true,
        unit: true,
        email: true,
        password: true,
        role: true,
        fines: true,
      }
    );
    return user;
  }

  async create({
    avatar,
    first_name,
    last_name,
    rank,
    unit,
    email,
    password,
    role,
    fines,
    states,
    documentId,
    phone,
    FN,
  }) {
    const userCreated = await UserMongoose.create({
      avatar,
      first_name,
      last_name,
      rank,
      unit,
      email: String(email ?? "").trim().toLowerCase(),
      password,
      role,
      fines: fines ?? [],
      states:
        Array.isArray(states) && states.length > 0
          ? states
          : buildDefaultUserStates(),
      ...(documentId != null && documentId !== ""
        ? { documentId: String(documentId).trim() }
        : {}),
      ...(phone != null && phone !== "" ? { phone: String(phone).trim() } : {}),
      ...(FN ? { FN } : {}),
    });
    return userCreated;
  }

  async updateOne({
    _id,
    avatar,
    first_name,
    last_name,
    rank,
    unit,
    email,
    password,
    role,
    fines,
    states,
    userTutorial,
    last_modified_by,
  }) {
    const update = {
      avatar,
      first_name,
      last_name,
      rank,
      unit,
      email,
      password,
      role,
      fines,
      last_modified_by,
    };
    if (states !== undefined) {
      update.states = states;
    }
    if (userTutorial !== undefined) {
      update.userTutorial = userTutorial;
    }
    const userUpdated = await UserMongoose.updateOne({ _id: _id }, update);
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
