import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { ApiError } from './errorHandler';

const prospectarSchema = Joi.object({
  latitud: Joi.number().min(-90).max(90).required(),
  longitud: Joi.number().min(-180).max(180).required(),
  radio: Joi.number().min(100).max(50000).optional(),
  tipos: Joi.array().items(Joi.string()).optional(),
});

export function validateProspectar(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { error, value } = prospectarSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    next(
      new ApiError(
        400,
        'Parámetros inválidos',
        error.details.map((d) => d.message),
      ),
    );
    return;
  }

  req.body = value;
  next();
}