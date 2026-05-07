import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { userService } from "../services/users.service.js";
import { createHash } from "../utils/Bcrypt.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { logger } from "../utils/logger.js";
import UserDTO from "./DTO/users.dto.js";
import { isValidUserUnit } from "../constants/userUnits.js";

function userWithoutPassword(user) {
  if (!user) return null;
  const o = user.toObject ? user.toObject() : { ...user };
  delete o.password;
  return o;
}

class UsersController {
  async getAll(req, res) {
    try {
      const users = await userService.getAll();
      return res.status(200).json({
        status: "success",
        msg: "All users found",
        payload: users,
      });
    } catch (e) {
      logger.info(e);
      return res.status(500).json({
        status: "error",
        msg: "Something went wrong",
        payload: {},
      });
    }
  }

  async findById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.findById(id);
      if (user) {
        return res.status(200).json({
          status: "success",
          message: "User by ID found",
          payload: userWithoutPassword(user),
        });
      } else {
        return res
          .status(404)
          .json({ status: "error", message: "User does not exist" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Internal server error!!" });
    }
  }

  async paginateList(req, res) {
    try {
      let {
        currentPage,
        pageSize,
        sort,
        first_name,
        last_name,
        rank,
        email,
        role,
        fines,
      } = req.query;
      const sortOption =
        sort === "asc"
          ? { last_name: 1 }
          : sort === "desc"
            ? { last_name: -1 }
            : {};

      const options = {
        sort: sortOption,
        limit: parseInt(pageSize, 10) || 10,
        page: parseInt(currentPage, 10) || 1,
      };

      const mongooseFilter = {};
      if (first_name) {
        mongooseFilter.first_name = { $regex: new RegExp(first_name, "i") };
      }
      if (last_name) {
        mongooseFilter.last_name = { $regex: new RegExp(last_name, "i") };
      }
      if (rank) {
        mongooseFilter.rank = { $regex: new RegExp(rank, "i") };
      }
      if (email) {
        mongooseFilter.email = { $regex: new RegExp(email, "i") };
      }
      if (role) {
        mongooseFilter.role = { $regex: new RegExp(role, "i") };
      }
      if (fines) {
        mongooseFilter.fines = { $size: parseInt(fines, 10) };
      }

      const queryResult = await UserMongoose.paginate(mongooseFilter, options);

      const paginatedUsers = queryResult.docs.map((u) => ({
        _id: u._id,
        first_name: u.first_name,
        last_name: u.last_name,
        rank: u.rank,
        unit: u.unit ?? "",
        email: u.email,
        role: u.role,
        fines: u.fines.length,
        avatar: u.avatar,
      }));

      const {
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
      } = queryResult;

      return res.status(200).json({
        status: "success",
        msg: "Users list",
        payload: {
          paginatedUsers,
          totalDocs,
          limit,
          totalPages,
          prevPage,
          nextPage,
          page,
          hasPrevPage,
          hasNextPage,
          pagingCounter,
        },
      });
    } catch (error) {
      console.error("Error getting users and pagination:", error);
      return res.status(500).json({
        status: "error",
        msg: "Error getting users and pagination.",
      });
    }
  }

  async create(req, res) {
    try {
      const { avatar, first_name, last_name, rank, unit, email, password } = req.body;
      if (!isValidUserUnit(unit)) {
        return res.status(400).json({
          status: "error",
          msg: "Debe indicar una unidad válida.",
          payload: {},
        });
      }
      const userDTO = new UserDTO(
        avatar,
        first_name,
        last_name,
        rank,
        email,
        createHash(password),
        undefined,
        unit
      );
      if (!userDTO.first_name || !userDTO.last_name || !userDTO.email) {
        logger.info(
          "Validation error: please complete first_name, last_name and email."
        );
        return res.status(400).json({
          status: "error",
          msg: "Please complete first_name, last_name and email.",
          payload: {},
        });
      }
      const userCreated = await userService.create(userDTO);
      return res.status(201).json({
        status: "success",
        msg: "User created",
        payload: userCreated,
      });
    } catch (e) {
      return res.status(500).json({
        status: "error",
        msg: "Something went wrong: " + e,
        payload: {},
      });
    }
  }

  async updateOne(req, res) {
    try {
      const { _id } = req.params;
      const { avatar, first_name, last_name, email } = req.body;
      if (!first_name || !last_name || !email || !_id) {
        logger.info(
          "Validation error: please complete firstName, lastName and email."
        );
        return res.status(400).json({
          status: "error",
          msg: "Please complete first_name, last_name and email.",
          payload: {},
        });
      }
      try {
        const userUpdated = await userService.updateOne({
          _id,
          avatar,
          first_name,
          last_name,
          email,
        });
        logger.info(JSON.stringify(userUpdated));
        if (userUpdated.matchedCount > 0) {
          return res.status(201).json({
            status: "success",
            msg: "User updated",
            payload: {},
          });
        } else {
          return res.status(404).json({
            status: "error",
            msg: "User not found",
            payload: {},
          });
        }
      } catch (e) {
        return res.status(500).json({
          status: "error",
          msg: "db server error while updating user",
          payload: {},
        });
      }
    } catch (e) {
      logger.info(e);
      return res.status(500).json({
        status: "error",
        msg: "something went wrong",
        payload: {},
      });
    }
  }

  async deleteOne(req, res) {
    try {
      const { _id } = req.params;

      const result = await userService.deleteOne({ _id });

      if (result?.deletedCount > 0) {
        return res.status(200).json({
          status: "success",
          msg: "User deleted",
          payload: {},
        });
      } else {
        return res.status(404).json({
          status: "failed",
          msg: "User not found",
          payload: {},
        });
      }
    } catch (e) {
      logger.info(e);
      return res.status(500).json({
        status: "error",
        msg: "Something went wrong",
        payload: {},
      });
    }
  }

  async updatePassword(req, res) {
    try {
      const email = req.user.email;
      const password = req.body;
      const userUpdated = await userService.updatePassword({ email, password });
      if (userUpdated) {
        return res.status(200).json({
          status: "success",
          msg: "Password updated",
          payload: {},
        });
      } else {
        return res.status(400).json({
          status: "failed",
          msg: "Password could not be updated",
          payload: {},
        });
      }
    } catch (error) {
      logger.info(error);
      return res.status(500).json({
        status: "error",
        msg: "Something went wrong " + error,
        payload: {},
      });
    }
  }

  async updatePasswordAndRender(req, res) {
    try {
      const user = req.user;
      const email = req.user.email;
      const { newPassword, confirmPassword } = req.body;
      if (newPassword == confirmPassword) {
        const userUpdated = await userService.updatePassword({
          email,
          newPassword: createHash(newPassword),
        });
        if (userUpdated.acknowledged == true) {
          logger.info(email + " actualizó su contraseña con éxito");
          const token = signAccessToken(user._id);
          return res.status(200).json({
            ok: true,
            msg: "Contraseña actualizada con éxito.",
            token,
          });
        }
        logger.error(email + " NO logró actualizar su contraseña con éxito");
        return res.status(400).json({
          ok: false,
          msg: "La contraseña no ha podido ser actualizada.",
        });
      }
      return res.status(400).json({
        ok: false,
        msg: "LAS CONTRASEÑAS DEBEN COINCIDIR",
      });
    } catch (error) {
      logger.error("Error de servidor: " + error);
      return res.status(500).json({
        status: "error",
        msg: "Something went wrong " + error,
        payload: {},
      });
    }
  }

  async sendNewAccEmail(req, res) {
    try {
      const { first_name, last_name, rank, email, newAccBody } = req.body;
      const emailSent = await userService.sendNewAccEmail({
        first_name,
        last_name,
        rank,
        email,
        newAccBody,
      });
      return res.status(200).json({
        ok: true,
        msg: "Solicitud enviada con éxito.",
      });
    } catch (error) {
      logger.error("Error in users.controller sendNewAccEmail: " + error);
      return res.status(400).json({
        ok: false,
        msg: "La solicitud no fue realizada con exito.",
      });
    }
  }

  async updateDataAndRender(req, res) {
    try {
      const {
        first_name,
        newFirstName,
        last_name,
        newLastName,
        rank,
        newRank,
        role,
        newRole,
        email,
        newEmail,
        newDataBody,
      } = req.body;
      const emailSent = await userService.sendNewDataEmail({
        first_name,
        newFirstName,
        last_name,
        newLastName,
        rank,
        newRank,
        role,
        newRole,
        email,
        newEmail,
        newDataBody,
      });
      return res.status(200).json({
        ok: true,
        msg: "Solicitud enviada con éxito.",
      });
    } catch (error) {
      logger.error("Error in users.controller updateDataAndRender: " + error);
      return res.status(400).json({
        ok: false,
        msg: "La solicitud no fue realizada con éxito.",
      });
    }
  }

  async createAndSendEmail(req, res) {
    const user = req.user;
    try {
      const { first_name, last_name, rank, unit, email, avatar } = req.body;
      if (!isValidUserUnit(unit)) {
        return res.status(400).json({
          ok: false,
          msg: "Debe indicar una unidad válida.",
        });
      }
      const password = createHash("123456789");
      const emailSent = await userService.sendDataToNewUser({
        first_name,
        last_name,
        rank,
        email,
      });
      const userCreated = await userService.create({
        avatar,
        first_name,
        last_name,
        rank,
        unit,
        email,
        password,
      });
      console.log(emailSent + " " + userCreated);
      if (emailSent && userCreated) {
        logger.info(
          `La cuenta de ${email} fue creada correctamente por ${user.email} (${user.rank}).`
        );
        return res.status(200).json({
          ok: true,
          msg: `Cuenta de ${email} fue creada con éxito.`,
        });
      }
      logger.info(
        `La cuenta de ${email} no fue creada correctamente por ${user.email} (${user.rank})`
      );
      return res.status(400).json({
        ok: false,
        msg: "La cuenta no pudo ser creada con éxito.",
      });
    } catch (error) {
      logger.error("Error in users.controller createAndSendEmail: " + error);
      return res.status(400).json({
        ok: false,
        msg: "La cuenta no pudo ser creada con éxito debido a un error del servidor. Por favor, verifica que el email utilizado no se encuentre ya en uso e intentelo nuevamente.",
      });
    }
  }

  async findByIdAndRenderForUpdate(req, res) {
    try {
      const { id } = req.query;
      const user = req.user;
      if (
        user.role !== "admin" &&
        user.role !== "superAdmin" &&
        user.role !== "contable"
      ) {
        return res.status(403).json({
          ok: false,
          msg: `Su rol "${user.role}" no cuenta con autorización para modificar usuarios.`,
        });
      }
      const userFound = await userService.findById(id);
      if (userFound) {
        return res.status(200).json({
          ok: true,
          userFound: userWithoutPassword(userFound),
        });
      }
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado. Verifique el ID.",
      });
    } catch (e) {
      logger.error("Error on userController.findByIdAndRenderForUpdate: " + e);
      return res.status(500).json({
        ok: false,
        msg: "Error del servidor al buscar usuario.",
      });
    }
  }

  async findByIdAndUpdate(req, res) {
    const user = req.user;
    const { id } = req.params;
    const updatedUser = { ...req.query, ...req.body };
    updatedUser._id = id;
    updatedUser.last_modified_by = user.email;
    if (
      Object.prototype.hasOwnProperty.call(updatedUser, "unit") &&
      !isValidUserUnit(updatedUser.unit)
    ) {
      return res.status(400).json({
        ok: false,
        msg: "Debe indicar una unidad válida.",
      });
    }
    try {
      const result = await userService.updateOne(updatedUser);
      if (result.matchedCount > 0) {
        logger.info(
          `Usuario ${updatedUser.rank} ${updatedUser.first_name} ${
            updatedUser.last_name
          } actualizado con éxito por ${user.rank} ${user.first_name} ${
            user.last_name
          }: ${JSON.stringify(updatedUser)}`
        );
        return res.status(200).json({
          ok: true,
          msg: `Usuario ${updatedUser.rank} ${updatedUser.first_name} ${updatedUser.last_name} actualizado con éxito.`,
        });
      }
      logger.info(
        `No se encontró el usuario con el ID: ${id} por ${user.rank} ${user.first_name} ${user.last_name}.`
      );
      return res.status(404).json({
        ok: false,
        msg: `El usuario con ID: ${id} no fue encontrado en la base de datos.`,
      });
    } catch (error) {
      logger.error(
        `Error de servidor al actualizar usuario con ID: ${id} por ${user.rank} ${user.first_name} ${user.last_name}:`,
        error
      );
      return res.status(500).json({
        ok: false,
        msg: `El usuario con el ID: ${id} no pudo ser actualizado por un error del servidor.`,
      });
    }
  }

  async findByIdAndRenderForDelete(req, res) {
    try {
      const { id } = req.query;
      const user = req.user;
      if (user.role !== "admin" && user.role !== "superAdmin") {
        return res.status(403).json({
          ok: false,
          msg: `Su rol "${user.role}" no cuenta con autorización para eliminar usuarios.`,
        });
      }
      const userFound = await userService.findById(id);
      if (userFound) {
        return res.status(200).json({
          ok: true,
          userFound: userWithoutPassword(userFound),
        });
      }
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado. Verifique el ID.",
      });
    } catch (e) {
      logger.error("Error on userController.findByIdAndRenderForDelete: " + e);
      return res.status(500).json({
        ok: false,
        msg: "Error del servidor al buscar usuario.",
      });
    }
  }

  async findByIdAndDelete(req, res) {
    const user = req.user;
    const { id } = req.params;
    try {
      const userFound = await userService.findById(id);
      if (userFound) {
        const userDeleted = await userService.deleteOne({ _id: id });
        if (userDeleted.deletedCount > 0) {
          logger.info(
            `Usuario ${userFound.rank} ${userFound.first_name} ${userFound.last_name} eliminado con éxito por ${user.rank} ${user.first_name} ${user.last_name} (${user.email}).`
          );
          return res.status(200).json({
            ok: true,
            msg: `Usuario ${userFound.rank} ${userFound.first_name} ${userFound.last_name} eliminado con éxito.`,
          });
        }
        logger.info(`No se encontró el usuario con ID: ${id} en la base de datos.`);
        return res.status(404).json({
          ok: false,
          msg: `El usuario con ID: ${id} no pudo ser eliminado por no encontrarse en la base de datos.`,
        });
      }
      return res.status(404).json({
        ok: false,
        msg: `Usuario con ID: ${id} no encontrado.`,
      });
    } catch (error) {
      logger.error(
        `Error de servidor al eliminar el usuario con ID: ${id} en la base de datos:`,
        error
      );
      return res.status(500).json({
        ok: false,
        msg: `El usuario con ID: ${id} no pudo ser eliminado por un error del servidor.`,
      });
    }
  }
}

export const usersController = new UsersController();
