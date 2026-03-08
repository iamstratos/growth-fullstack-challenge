import { gql } from "apollo-server-express";

export const typeDefs = gql`
  scalar Long
  scalar JSON

  type ParentProfile {
    id: Long!
    name: String!
    child: String!
  }

  type PaymentMethod {
    id: Long!
    parentId: Int!
    method: String!
    isActive: Boolean!
    createdAt: String!
  }

  type Invoice {
    id: Long!
    parentId: Int!
    amount: Float!
    date: String!
  }

  type PaymentMethodAuditLog {
    id: Long!
    paymentMethodId: Long
    parentId: Long!
    action: String!
    oldState: JSON
    newState: JSON
    changedBy: String!
    changedAt: String!
  }

  type Query {
    parentProfile(parentId: Long!): ParentProfile
    paymentMethods(parentId: Long!): [PaymentMethod]
    invoices(parentId: Long!): [Invoice]
    paymentMethodAuditLog(parentId: Long!): [PaymentMethodAuditLog]
  }

  type Mutation {
    addPaymentMethod(parentId: Long!, method: String!): PaymentMethod
    setActivePaymentMethod(parentId: Long!, methodId: Long!): PaymentMethod
    deletePaymentMethod(parentId: Long!, methodId: Long!): Boolean
  }
`;
