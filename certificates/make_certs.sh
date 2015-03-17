echo :: CA CERTIFICATES :: 

openssl genrsa -des3 -out ca.key 2048
openssl req -new -x509 -days 365 -key ca.key -out ca.crt
openssl x509 -in ca.crt -text -noout

echo :: SERVER KEY :: 

openssl genrsa -out server.key 1024
openssl req -new -key server.key -out server.csr
openssl x509 -req -in server.csr -out server.crt -CA ca.crt -CAkey ca.key -CAcreateserial -days 365
openssl x509 -in server.crt -text -noout

echo :: CLIENT KEY :: 

openssl genrsa -out userA.key 1024
openssl req -new -key userA.key -out userA.csr
openssl x509 -req -in userA.csr -out userA.crt -CA ca.crt -CAkey ca.key -CAcreateserial -days 365
openssl x509 -in userA.crt -text -noout

echo :: CLEANUP ::

rm *.csr
mkdir -p keys certs ca
mv ca.* ca/
mv *.key keys/
mv *.crt certs/

echo :: P12 KEY FOR BROWSER :: 

openssl pkcs12 -export -in certs/userA.crt -inkey keys/userA.key -name "User A test cert" -out userA.p12

