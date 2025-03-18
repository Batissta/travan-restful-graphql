import {
  validateLoginPayload,
  validateCriarPayload,
  validateAtualizarPayload,
} from "../validations/usuarioZod";
import UsuarioRepository from "../models/modelUsuario";
import { listarMotoristas, criarMotorista } from "./controllerMotorista";
import { randomUUID } from "node:crypto";
import env from "../config/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  padronizaResponseUsers,
  padronizaResponseUser,
  TSchemaUserUnpadronized,
} from "../helpers/padronizers/padronizeUsuario";
import usuarioRepo from "../helpers/usuarioRepoMethods";
import motoristaRepo from "../helpers/motoristaRepoMethods";

export const createUser = async (req: any, res: any) => {
  try {
    const emailEmUso = await UsuarioRepository.findOne({
      email: req.body.email,
    });
    if (emailEmUso && emailEmUso.nome)
      return res
        .status(409)
        .json({ mensagem: "Este e-mail já está sendo utilizado!" });

    if (req.body.tipo === "motorista") return criarMotorista(req, res);
    const result = validateCriarPayload(req.body);

    if (!result.success)
      return res.status(400).send({
        mensagem:
          "Você enviou algo fora do formato correto, busque a documentação!",
        erros: result.errors,
      });

    const usuarioId = `u.${randomUUID()}`;
    result.data.senha = await bcrypt.hash(
      result.data.senha,
      Number(env.ROUNDS)
    );

    const usuarioCriado: TSchemaUserUnpadronized =
      await UsuarioRepository.create({
        id: usuarioId,
        ...result.data,
      });

    const userPadronized = padronizaResponseUser(usuarioCriado);
    if (!userPadronized.success)
      return res.status(400).json({
        erros: userPadronized.errors,
      });
    return res.status(201).json({
      mensagem: "Usuário criado com sucesso!",
      usuario: userPadronized.data,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensage: error.message,
      });
  }
};

export const findUsers = async (req: any, res: any) => {
  try {
    const passageiros = await usuarioRepo.find({ tipo: "passageiro" });
    const motoristas = await motoristaRepo.findAll();
    res.status(200).json({
      quantidadePassageiros: passageiros.length,
      passageiros: passageiros,
      quantidadeMotoristas: motoristas.length,
      motoristas: motoristas,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensagem: error.message,
      });
  }
};

export const updateUser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const resultValidate = validateAtualizarPayload(req.body);
    if (!resultValidate.success)
      return res.status(400).json({
        message:
          "Dados inválidos. Acesse a documentação da API para mais informações!\nhttps://github.com/Batissta/express-zod-auth-api",
        errors: resultValidate.errors,
      });
    const userToUpdate: TSchemaUserUnpadronized | any =
      await UsuarioRepository.findOneAndUpdate(
        { id },
        { $set: { ...resultValidate.data } },
        { new: true }
      );
    if (!(userToUpdate && userToUpdate.nome))
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    const userResponse = padronizaResponseUser(userToUpdate);
    return res.status(200).json({
      message: "Usuário atualizado com sucesso!",
      usuario: userResponse.data,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensagem: error.message,
      });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const result = validateLoginPayload(req.body);
    if (!result.success)
      return res.status(400).json({
        errors: result.errors,
      });
    const user = await UsuarioRepository.findOne({
      email: result.data.email,
    });

    if (!(user && user.nome))
      return res.status(400).json({ mensagem: "Credenciais Inválidas!" });

    const isThepasswordValid = await bcrypt.compare(
      result.data.senha,
      user.senha
    );

    if (!isThepasswordValid)
      return res.status(400).json({ mensagem: "Credenciais Inválidas!" });

    const token = jwt.sign(user.id, env.SECRET);
    return res.status(200).json({
      mensagem: "Login efetuado com sucesso!",
      authorization: token,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensage: error.message,
      });
  }
};

export const findByType = async (req: any, res: any) => {
  try {
    const { tipo } = req.params;
    if (!(tipo === "passageiros") && !(tipo === "motoristas"))
      return res.status(400).json({
        mensage: "Tipo inválido!",
      });
    if (tipo == "motoristas") return listarMotoristas(req, res);
    const passageiros = await UsuarioRepository.find({ tipo: "passageiro" });
    const passageirosResponse = padronizaResponseUsers(passageiros);
    return res.status(200).json({
      quantidade: passageirosResponse.length,
      pessoas: passageirosResponse,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensage: error.message,
      });
  }
};

export const findById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user: any = await UsuarioRepository.findOne({ id });
    if (!user)
      return res.status(404).json({
        message: "Usuário não encontrado!",
      });
    const passageirosResponse = padronizaResponseUser(user);
    return res.status(200).json({
      usuario: passageirosResponse.data,
    });
  } catch (error: unknown) {
    if (error instanceof Error)
      return res.status(400).json({
        mensage: error.message,
      });
  }
};
