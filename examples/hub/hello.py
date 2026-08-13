import runloop
from hub import light_matrix

print("hello from Sherlock 2")


async def main():
    await light_matrix.write("Hi")
    print("wrote Hi on the matrix")


runloop.run(main())
