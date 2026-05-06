import { RecoverTokensMongoose } from "./mongoose/tokens.mongoose.js";

export default class RecoverTokensModel {
    async create({token, email, expire}) {
        const newRecoverToken = RecoverTokensMongoose.create({
            token: token,
            email: email,
            expire: expire,
        })
        return newRecoverToken
    }

    async findOne({token, email}) {
        const recoverTokenFound = await RecoverTokensMongoose.findOne({ token, email });
        return recoverTokenFound;
    }
}

export const recoverTokensModel = new RecoverTokensModel();