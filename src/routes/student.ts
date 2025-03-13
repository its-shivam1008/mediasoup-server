import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";
import bcrypt from "bcryptjs";
import { ApiResponse } from "../types/ApiResponse";
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
        const response = await prismaClient.student.create({data:{...data}});
        res.status(200).json({response});
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
        const response = await prismaClient.student.findUnique({where:{email:email}});
        if(!response){
            res.status(404).json({success:false, message:"Unable to find user"});
            return;
        }
        if(!(await comparePasssword(password, response?.password as string))){
            res.status(400).json({success:false, message:"Wrong password"});
            return;
        }
        res.status(200).json({success:true, message:"Logged in success"});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
})

export default router;