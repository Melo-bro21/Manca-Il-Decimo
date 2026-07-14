const {prisma} = require('../../shared/prisma');

const findUserByEmail = async (email) =>{
    return prisma.user.findUnique({
        where: {
            email,
        },
    });
};

const createUser = async (userData) => {
    return prisma.user.create({
        data: userData,
    });
};

module.exports = {
    findUserByEmail,
    createUser,
};