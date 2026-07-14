const { prisma } = require('../../shared/prisma');

async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

async function updateUserPassword(id, passwordHash) {
  return prisma.user.update({
    where: { id },
    data: {
      passwordHash,
    },
  });
}

module.exports = {
  findUserById,
  findUserByEmail,
  updateUser,
  updateUserPassword,
};