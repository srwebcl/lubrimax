import { prisma } from '../src/lib/prisma';
import { titleCase, formatPhone } from '../src/lib/contact';

// Normaliza nombres y teléfonos ya guardados con el mismo formato que usa la
// app al guardar (src/lib/contact.ts).


async function main() {
  const clients = await prisma.workshopClient.findMany();
  let updated = 0;
  for (const c of clients) {
    const newName = titleCase(c.name);
    const newPhone = c.phone ? formatPhone(c.phone) : c.phone;
    if (newName !== c.name || newPhone !== c.phone) {
      await prisma.workshopClient.update({
        where: { id: c.id },
        data: { name: newName, phone: newPhone }
      });
      updated++;
    }
  }

  const bookings = await prisma.booking.findMany();
  let updatedBookings = 0;
  for (const b of bookings) {
    const newName = titleCase(b.customerName);
    const newPhone = b.customerPhone ? formatPhone(b.customerPhone) : b.customerPhone;
    if (newName !== b.customerName || newPhone !== b.customerPhone) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { customerName: newName, customerPhone: newPhone }
      });
      updatedBookings++;
    }
  }

  console.log(`Updated ${updated} workshop clients and ${updatedBookings} bookings.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
