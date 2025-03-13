import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const jwtAuthMiddleware = (req:Request, res:Response, next:NextFunction) => {
    const cookie = req.cookies;

    if(!cookie){
        res.status(401).json({success:false, message:"Cookie not found"});
        return;
    }

    const token = cookie.uid;

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