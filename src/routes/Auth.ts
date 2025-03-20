import express, { Request, Response, Router } from "express";
import { prismaClient } from "../lib/db";
import bcrypt from "bcryptjs";
import { generateToken, jwtAuthMiddleware } from "../middlewares/JwtAuthMiddleware";
import { sendVerificationEmail } from "../emails/verificationEmail";
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

// isVerrified, verifyCode, verifyCodeExpiry

router.post('/signup', async(req, res) => {
    try{
        const data:any = req.body;

        const isUserExist = await prismaClient.user.findUnique({where:{email:data.email}});
        if(isUserExist){
            res.status(409).json({success:false, message:"User with this email already exists."});
            return;
        }

        await hashPassword(data);

        const verifyCode = Math.floor(100000+Math.random()*900000).toString();
        const verifyCodeExpiry = new Date();
        verifyCodeExpiry.setHours(verifyCodeExpiry.getHours()+1);
        data.isVerified = false;
        data.verifyCode = verifyCode;
        data.verifyCodeExpiry = verifyCodeExpiry;

        const response = await prismaClient.user.create({data:{...data}});

        if (response.role === "TEACHER") {
            await prismaClient.teacher.create({
                data: {
                    id: response.id,
                },
            });
        }else{
            await prismaClient.student.create({
                data: {
                    id: response.id,
                },
            });
        }


        const payload = {
            id:response.id,
            email:response.email,
            role:response.role
        }
        const token = generateToken(payload);

        const isEmailSent = await sendVerificationEmail(response.email, response.name, response.verifyCode);
        if(!isEmailSent.success){
            await prismaClient.user.delete({where:{email:response.email}});
            res.status(400).json({success:false, message:isEmailSent.message});
            return;
        }

        res.status(200).json({message:"Verification email has been sent and cookies received", success:true, token});
    }catch(err){
        res.status(500).json({message:"Internal server error", success:false, err});
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
            role:response.role
        }
        const token = generateToken(payload);
        res.status(200).json({message:"User logged in", success:true, token});
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error"});
    }
});

router.put('/verify', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = await prismaClient.user.findUnique({where:{email:data.email}});
        if(!user){
            res.status(404).json({success:false, message:"Unable to find user"});
            return;
        }

        if(data.verifyCode != user.verifyCode){
            res.status(400).json({success:false, message:"OTP is incorrect"});
            return;
        }

        if(new Date() > user.verifyCodeExpiry){
            res.status(400).json({success:false, message:"OTP has been expired, try generating a new one"});
            return;
        }

        await prismaClient.user.update({where:{email:data.email}, data:{isVerified:true}});
        res.status(200).json({success:true, message:"User is verified"});
        

    }catch(err){
        res.status(500).json({success:false, message:"Internal server error", err});
    }
});

router.put('/resend-otp', async(req:Request, res:Response)=>{
    try{
        const data = req.body;

        const user = await prismaClient.user.findUnique({where:{email:data.email}});
        if(!user){
            res.status(404).json({success:false, message:"Unable to find user"});
            return;
        }

        if(user.isVerified){
            res.status(400).json({success:true, message:"User is already verified"});
            return;
        }

        const verifyCode = Math.floor(100000+Math.random()*900000).toString();
        const verifyCodeExpiry = new Date();
        verifyCodeExpiry.setHours(verifyCodeExpiry.getHours()+1);

        const updatedUser = await prismaClient.user.update({where:{email:user.email}, data:{verifyCode, verifyCodeExpiry}});

        if(!updatedUser){
            res.status(400).json({success:false, message:"Cannot generate the otp at this moment"});
        }

        const isEmailSent = await sendVerificationEmail(updatedUser.email, updatedUser.name, updatedUser.verifyCode);
        if(!isEmailSent.success){
            res.status(400).json({success:false, message:isEmailSent.message});
            return;
        }

        res.status(200).json({success:true, message:"OTP regenrated and sent"})
    }catch(err){
        res.status(500).json({success:false, message:"Internal server error", err});
    }
});

router.get('/auth/me', jwtAuthMiddleware, async(req:Request, res:Response)=>{
    try{
        res.status(200).json({ success: true, message:"Token verified", user: (req as any).user });
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