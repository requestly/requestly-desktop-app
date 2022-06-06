import * as forge from "node-forge";

const {
  pki,
  md,
  util: { encode64 },
} = forge;

const generateSPKIFingerprint = (certPem) => {
  let cert = pki.certificateFromPem(certPem.toString("utf8"));
  return encode64(
    pki.getPublicKeyFingerprint(cert.publicKey, {
      type: "SubjectPublicKeyInfo",
      md: md.sha256.create(),
      encoding: "binary",
    })
  );
};

export default generateSPKIFingerprint;
