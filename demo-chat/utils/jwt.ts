import jwt from 'jsonwebtoken';

export const verifyToken = (token: string) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);
  return decoded;
};


export const signToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
};
