import { prismaClient } from "../lib/db";

type StudentAuthorization = (classId:string, userId:string, role:string) => Promise<boolean>
export const studentAuthorization:StudentAuthorization = async (classId, userId, role) =>{
    try{
        if(role === 'TEACHER') return true;
        const studentEnroll = await prismaClient.classEnrollment.findMany({where:{classId:classId, studentId:userId}});
        if(!studentEnroll) return false;
        return true;
    }catch(err){
        console.error("Some error occured ", err);
        return false;
    }
}