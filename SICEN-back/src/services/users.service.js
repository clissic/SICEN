import env from "../config/env.config.js";
import { usersModel } from "../DAO/models/users.model.js";
import { transport } from "../utils/nodemailer.js";
import { logger } from "../utils/logger.js";

class UserService {
  async getAll() {
    try {
      return await usersModel.getAll();
    } catch (error) {
      throw new Error("Failed to find users: " + error);
    }
  }

  async findById(id) {
    try {
      return await usersModel.findById(id);
    } catch (error) {
      throw new Error("Failed to find user by ID: " + error);
    }
  }

  async create({ avatar, first_name, last_name, rank, email, password }) {
    try {
      return await usersModel.create({
        avatar,
        first_name,
        last_name,
        rank,
        email,
        password,
      });
    } catch (error) {
      throw new Error("Failed to create a user: " + error);
    }
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
    last_modified_by
  }) {
    try {
      return await usersModel.updateOne({
        _id,
        avatar,
        first_name,
        last_name,
        rank,
        email,
        password,
        role,
        last_modified_by
      });
    } catch (error) {
      throw new Error("Failed to update user by ID");
    }
  }

  async deleteOne({ _id }) {
    try {
      return await usersModel.deleteOne({ _id });
    } catch (error) {
      throw new Error("Failed to delete user by ID: " + error);
    }
  }

  async findByEmail(email) {
    try {
      return await usersModel.findByEmail(email);
    } catch (error) {
      throw new Error("Failed to find user by email: " + error);
    }
  }

  async updatePassword({ email, newPassword }) {
    try {
      const userUpdated = await usersModel.updatePassword({ email, password: newPassword });
      return userUpdated;
    } catch (error) {
      throw new Error("Failed to update password: " + error);
    }
  }

  async updateFines({ _id, fines }) {
    try {
      return await usersModel.updateFines({ _id, fines });
    } catch (error) {
      throw new Error("Failed to update fines: " + error);
    }
  }

  async sendNewAccEmail({first_name, last_name, rank, email, newAccBody}) {
    try {
      await transport.sendMail({
        from: env.googleEmail,
        to: env.googleEmail,
        subject: "[SIGMU] Solicitud de creación de cuenta",
        html: `
                <div>
                    <h1>SIGMU</h1>
                    <p>Solicitud de nueva cuenta del Sr./Sra.:</p>
                    <h3>${rank} ${first_name} ${last_name}</h3>
                    <h4>${email}</h4>
                    <p>Justificación:</p>
                    <strong>${newAccBody}</strong>
                    <p>Se ruega no responder a este correo ya que se trata de un servicio automático de SIGMU.</p>
                </div>
            `,
      });
    } catch (error) {
      logger.error(`Email could not be sent successfully: ` + error);
    }
  }

  async sendNewDataEmail({ first_name, newFirstName, last_name, newLastName, rank, newRank, role, newRole, email, newEmail, newDataBody }) {
    try {
      await transport.sendMail({
        from: env.googleEmail,
        to: env.googleEmail,
        subject: "[SIGMU] Solicitud de actualización de datos",
        html: `
                <div>
                    <h1>SIGMU</h1>
                    <p>Solicitud de actualización de datos del Sr./Sra.:</p>
                    <h3>${rank} ${first_name} ${last_name}</h3>
                    <h4>${email} (${role})</h4>
                    <p>El/la cual quiere actualizar su información en el siguiente tenor:</p>
                    <ul>
                      <li>Nombre: <strong>${newFirstName}</strong></li>
                      <li>Apellido: <strong>${newLastName}</strong></li>
                      <li>Grado: <strong>${newRank}</strong></li>
                      <li>Email: <strong>${newEmail}</strong></li>
                      <li>Rol: <strong>${newRole}</strong></li>
                    </ul>
                    <p>Justificación:</p>
                    <strong>${newDataBody}</strong>
                    <p>Se ruega no responder a este correo ya que se trata de un servicio automático de SIGMU.</p>
                </div>
            `,
      });
    } catch (error) {
      logger.error("Email could not be sent successfully: " + error);
    }
  }

  async sendDataToNewUser({ first_name, last_name, rank, email }) {
    try {
      await transport.sendMail({
        from: env.googleEmail,
        to: email,
        subject: "[SIGMU] Bienvenido a SIGMU",
        html: `
                <div>
                    <h1>SIGMU</h1>
                    <p>Estimado/a:</p>
                    <h3>${rank} ${first_name} ${last_name}</h3>
                    <h4>Bienvenido al Sistema de Gestión de Multas de la Prefectura del Puerto de Montevideo</h4>
                    <p>Es necesario, antes de comenzar a utilizar el sistema, que entienda que el mismo es de uso exclusivo para el personal de la Prefectura del Puerto de Montevideo y usuarios con relación directa a esta. Además, es importante aclarar que el sistema es 100% auditable en relación a las acicones de los usuarios, por lo que cualquier uso indebido del mismo podrá ser causal de consecuencias administrativas.</p>
                    <p>Sus credenciales para el uso del sistema son:</p>
                    <ul>
                      <li>Email: <strong>${email}</strong></li>
                      <li>Contraseña: <strong>123456789</strong></li>
                    </ul>
                    <p>Se recomienda realizar el cambio de contraseña ni bien tenga oportunidad de ingresar en el sistema. Este podrá realizarse desde el panel de usuario. Así mismo, se recomienda no compartir sus credenciales con nadie.</p>
                    <p><strong>Ingreso al sistema:</strong> <a href="${env.publicAppUrl}/">${env.publicAppUrl}/</a></p>
                    <br>
                    <p>Se ruega no responder a este correo ya que se trata de un servicio automático de SIGMU.</p>
                </div>
            `,
      });
      return true;
    } catch (error) {
      logger.error("Email could not be sent successfully: " + error);
    }
  }
}

export const userService = new UserService();
