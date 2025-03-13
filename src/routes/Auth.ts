import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";
import bcrypt from "bcryptjs";
import { generateToken, jwtAuthMiddleware } from "../middlewares/JwtAuthMiddleware";
const router = express.Router();

const hashPassword = async (data:any)=>{
    try{

        const salt = await bcrypt.genSalt(8);

        const hashedPasssword = await bcrypt.hash(data.password, salt)

        data.password  = hashedPasssword;

    }catch(err){
        console.error("Error in hashing password",err);
    }
}

const comparePasssword = async (candidatePassword:string, userPassword:string)=>{
    try{
        const isMatch = await bcrypt.compare(candidatePassword, userPassword);
        return isMatch;
    }catch(err){
        console.log("Error in comparing passwords",err);
    }
}

router.get('/', async(req, res) => {
    res.status(200).send("Hellow from users");
});

router.post('/signup', async(req, res) => {
    try{
        const data:any = req.body;
        await hashPassword(data);
        const response = await prismaClient.user.create({data:{...data}});
        const payload = {
            id:response.id,
            email:response.email,
        }
        const token = generateToken(payload);
        res.status(200).cookie('uid', token, {
        httpOnly: true,  
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        maxAge: 15 * 24 * 60 * 60 * 1000,  // Cookie expires in 15 days
        }).json({message:"Token generated", success:true});
    }catch(err){
        res.status(500).json({message:"Internal server error", err});
    }

});


router.post('/login', async(req:Request, res:Response) =>{
    try{
        const {email, password}:{email:string, password:string} = req.body;
        if(!email || !password){
            res.status(404).json({success:false, message:"Email and passssword is needed"});
            return;
        }
        const response = await prismaClient.user.findUnique({where:{email:email}});
        if(!response){
            res.status(404).json({success:false, message:"Unable to find user"});
            return;
        }
        if(!(await comparePasssword(password, response?.password as string))){
            res.status(400).json({success:false, message:"Wrong password"});
            return;
        }
        const payload = {
            id:response.id,
            email:response.email,
        }
        const token = generateToken(payload);
        res.status(200).cookie('uid', token, {
        httpOnly: true,  
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        maxAge: 15 * 24 * 60 * 60 * 1000,  // Cookie expires in 15 days
        }).json({message:"User logged in", success:true});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.get('/auth/me', jwtAuthMiddleware, async(req:Request, res:Response)=>{
    try{
        res.status(200).json({ success: true, message:"Cookie verified", user: (req as any).user });
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.post('/logout', async(req:Request, res:Response)=>{
    try{
        res.clearCookie("uid"); // Remove token cookie
        res.status(200).json({ success: true, message: "Logged out" });
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})

export default router;