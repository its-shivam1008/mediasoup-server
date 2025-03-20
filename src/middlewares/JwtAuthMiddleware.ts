import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const jwtAuthMiddleware = (req:Request, res:Response, next:NextFunction) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        res.status(401).json({success:false, message:"Token not found"});
        return;
    }   
    const token = authorization.split(' ')[1];

    if(!token){
        res.status(401).json({success:false, message:"Unauthorized"});
        return;
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    }catch(err){
        res.status(401).json({success:false, message:"Invalid token"});
    }
}

export const generateToken = (userData:any) =>{ 
    return jwt.sign(userData, process.env.JWT_SECRET as string, {expiresIn: '15d'});
}